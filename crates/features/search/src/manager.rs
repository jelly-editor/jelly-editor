use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use grep_matcher::Matcher;
use grep_regex::{RegexMatcher, RegexMatcherBuilder};
use grep_searcher::sinks::UTF8;
use grep_searcher::{BinaryDetection, Searcher, SearcherBuilder};
use ignore::WalkBuilder;
use jelly_protocol::{SearchDonePayload, SearchMatch, SearchResultPayload};
use tauri::{AppHandle, Emitter};

/// Stop after this many total matches so a broad query can't flood the UI.
const MAX_RESULTS: usize = 5_000;
/// Cap matches reported per line (e.g. a single-char query on a long line).
const MAX_RANGES_PER_LINE: usize = 200;

/// What a single search needs to run.
pub struct SearchParams {
    pub search_id: u64,
    pub workspace: String,
    pub query: String,
    pub case_sensitive: bool,
    pub is_regex: bool,
}

/// Tracks the currently active search so a newer one (or an explicit cancel)
/// supersedes any walk still in flight. The walk thread checks `active` and
/// bails the moment its id is no longer current.
#[derive(Clone)]
pub struct SearchManager {
    active: Arc<AtomicU64>,
}

impl Default for SearchManager {
    fn default() -> Self {
        Self::new()
    }
}

impl SearchManager {
    pub fn new() -> Self {
        Self {
            active: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Validate the pattern, mark this search active, and walk the workspace on
    /// a background thread emitting results. Returns `Err` for a bad regex.
    pub fn start(&self, app: AppHandle, params: SearchParams) -> Result<(), String> {
        let SearchParams {
            search_id,
            workspace,
            query,
            case_sensitive,
            is_regex,
        } = params;

        let matcher = build_matcher(&query, case_sensitive, is_regex)?;

        // From here on, this is the active search.
        self.active.store(search_id, Ordering::SeqCst);
        let active = self.active.clone();

        std::thread::spawn(move || {
            let mut searcher = SearcherBuilder::new()
                .binary_detection(BinaryDetection::quit(0))
                .line_number(true)
                .build();

            let mut total = 0usize;
            let mut capped = false;

            for dent in WalkBuilder::new(&workspace).build() {
                if active.load(Ordering::SeqCst) != search_id {
                    return; // superseded or cancelled — drop silently
                }

                let dent = match dent {
                    Ok(d) => d,
                    Err(_) => continue,
                };
                if !dent.file_type().map_or(false, |t| t.is_file()) {
                    continue;
                }
                let path = dent.path();
                let matches = search_file(&mut searcher, &matcher, path);
                if matches.is_empty() {
                    continue;
                }

                total += matches.len();
                if total >= MAX_RESULTS {
                    capped = true;
                }

                let _ = app.emit(
                    "search:result",
                    SearchResultPayload {
                        search_id,
                        path: path.to_string_lossy().into_owned(),
                        rel_path: rel_path(&workspace, path),
                        matches,
                    },
                );

                if capped {
                    break;
                }
            }

            if active.load(Ordering::SeqCst) == search_id {
                let _ = app.emit("search:done", SearchDonePayload { search_id, capped });
            }
        });

        Ok(())
    }

    /// Cancel the active search. The next id check in the walk thread aborts it.
    pub fn cancel(&self) {
        self.active.fetch_add(1, Ordering::SeqCst);
    }
}

/// Build the matcher. Literal queries are escaped so there's a single code path.
pub(crate) fn build_matcher(
    query: &str,
    case_sensitive: bool,
    is_regex: bool,
) -> Result<RegexMatcher, String> {
    if query.is_empty() {
        return Err("Empty query".into());
    }
    let pattern = if is_regex {
        query.to_string()
    } else {
        regex::escape(query)
    };
    RegexMatcherBuilder::new()
        .case_insensitive(!case_sensitive)
        .build(&pattern)
        .map_err(|e| e.to_string())
}

/// Collect every matching line in `path`, with per-line match ranges. Returns an
/// empty vec for non-matching, binary, or unreadable files.
pub(crate) fn search_file(
    searcher: &mut Searcher,
    matcher: &RegexMatcher,
    path: &Path,
) -> Vec<SearchMatch> {
    let mut matches: Vec<SearchMatch> = Vec::new();
    let _ = searcher.search_path(
        matcher,
        path,
        UTF8(|lnum, line| {
            let mut ranges: Vec<[u32; 2]> = Vec::new();
            let _ = matcher.find_iter(line.as_bytes(), |m| {
                ranges.push([char_index(line, m.start()), char_index(line, m.end())]);
                ranges.len() < MAX_RANGES_PER_LINE
            });
            matches.push(SearchMatch {
                line: lnum as u32,
                text: line.trim_end_matches(['\n', '\r']).to_string(),
                ranges,
            });
            Ok(true)
        }),
    );
    matches
}

/// Byte offset → character index within `line`, so the frontend can slice the
/// JS string by char to highlight matches (byte offsets would break on UTF-8).
fn char_index(line: &str, byte: usize) -> u32 {
    line[..byte].chars().count() as u32
}

fn rel_path(workspace: &str, path: &Path) -> String {
    path.strip_prefix(workspace)
        .unwrap_or(path)
        .to_string_lossy()
        .into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn searcher() -> Searcher {
        SearcherBuilder::new()
            .binary_detection(BinaryDetection::quit(0))
            .line_number(true)
            .build()
    }

    fn write(dir: &std::path::Path, name: &str, body: &str) -> std::path::PathBuf {
        let p = dir.join(name);
        let mut f = std::fs::File::create(&p).unwrap();
        f.write_all(body.as_bytes()).unwrap();
        p
    }

    #[test]
    fn finds_lines_with_ranges() {
        let dir = std::env::temp_dir().join(format!("jelly-search-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = write(&dir, "a.txt", "let foo = 1;\nbar\nfoo foo\n");

        let matcher = build_matcher("foo", true, false).unwrap();
        let matches = search_file(&mut searcher(), &matcher, &file);

        assert_eq!(matches.len(), 2);
        assert_eq!(matches[0].line, 1);
        assert_eq!(matches[0].ranges, vec![[4, 7]]);
        // Two matches on one line yield two ranges.
        assert_eq!(matches[1].line, 3);
        assert_eq!(matches[1].ranges, vec![[0, 3], [4, 7]]);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn case_and_literal_vs_regex() {
        let dir = std::env::temp_dir().join(format!("jelly-search-case-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = write(&dir, "b.txt", "Foo\nfoo\nf.o\n");

        // Case-insensitive literal matches both Foo and foo (not "f.o").
        let m = build_matcher("foo", false, false).unwrap();
        assert_eq!(search_file(&mut searcher(), &m, &file).len(), 2);

        // Case-sensitive literal matches only lowercase foo.
        let m = build_matcher("foo", true, false).unwrap();
        assert_eq!(search_file(&mut searcher(), &m, &file).len(), 1);

        // Literal "f.o" must not be treated as a regex: only the literal line.
        let m = build_matcher("f.o", true, false).unwrap();
        let res = search_file(&mut searcher(), &m, &file);
        assert_eq!(res.len(), 1);
        assert_eq!(res[0].text, "f.o");

        // As a regex, "f.o" matches both "foo" and "f.o" (case-sensitive).
        let m = build_matcher("f.o", true, true).unwrap();
        assert_eq!(search_file(&mut searcher(), &m, &file).len(), 2);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn invalid_regex_errors() {
        assert!(build_matcher("(", false, true).is_err());
        assert!(build_matcher("", false, false).is_err());
    }

    #[test]
    fn char_index_handles_multibyte() {
        // "héllo": 'é' is two bytes, so byte 3 is char index 2.
        assert_eq!(char_index("héllo", 3), 2);
    }
}
