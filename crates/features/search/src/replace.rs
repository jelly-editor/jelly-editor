use std::collections::HashSet;
use std::path::Path;

use regex::{Regex, RegexBuilder};

/// Build the whole-string regex used for replacement. Literal queries are
/// escaped so a query like `f.o` matches literally; in regex mode the pattern
/// is used as-is. Mirrors the matcher semantics on the search side.
pub(crate) fn build_regex(
    query: &str,
    case_sensitive: bool,
    is_regex: bool,
) -> Result<Regex, String> {
    if query.is_empty() {
        return Err("Empty query".into());
    }
    let pattern = if is_regex {
        query.to_string()
    } else {
        regex::escape(query)
    };
    RegexBuilder::new(&pattern)
        .case_insensitive(!case_sensitive)
        .build()
        .map_err(|e| e.to_string())
}

/// Replace matches in `path`, writing the result back. When `lines` is `Some`,
/// only matches on those 1-based line numbers are replaced (so the UI can act
/// on a single result row); `None` replaces every match in the file.
///
/// In regex mode the replacement string expands capture references (`$1`,
/// `${name}`); otherwise it is inserted literally. Returns the number of
/// replacements made; the file is left untouched when that is zero.
pub(crate) fn replace_in_file(
    path: &Path,
    re: &Regex,
    replacement: &str,
    is_regex: bool,
    lines: Option<&HashSet<u32>>,
) -> Result<u32, String> {
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;

    let mut out = String::with_capacity(content.len());
    let mut count = 0u32;
    let mut line_no = 0u32;

    // split_inclusive keeps each line's trailing newline, so matching is
    // line-scoped (as in search) and the output round-trips byte-for-byte.
    for line in content.split_inclusive('\n') {
        line_no += 1;
        if lines.is_some_and(|set| !set.contains(&line_no)) {
            out.push_str(line);
            continue;
        }

        let mut last = 0;
        for caps in re.captures_iter(line) {
            let m = caps.get(0).unwrap();
            out.push_str(&line[last..m.start()]);
            if is_regex {
                caps.expand(replacement, &mut out);
            } else {
                out.push_str(replacement);
            }
            last = m.end();
            count += 1;
        }
        out.push_str(&line[last..]);
    }

    if count > 0 {
        std::fs::write(path, out).map_err(|e| e.to_string())?;
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn temp(name: &str, body: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "jelly-replace-{}-{}",
            std::process::id(),
            name
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("f.txt");
        std::fs::File::create(&p).unwrap().write_all(body.as_bytes()).unwrap();
        p
    }

    fn read(p: &Path) -> String {
        std::fs::read_to_string(p).unwrap()
    }

    #[test]
    fn replaces_all_literal() {
        let p = temp("all", "foo bar foo\nbaz\nfoo\n");
        let re = build_regex("foo", true, false).unwrap();
        let n = replace_in_file(&p, &re, "X", false, None).unwrap();
        assert_eq!(n, 3);
        assert_eq!(read(&p), "X bar X\nbaz\nX\n");
        std::fs::remove_file(&p).ok();
    }

    #[test]
    fn replaces_only_given_lines() {
        let p = temp("lines", "foo\nfoo\nfoo\n");
        let re = build_regex("foo", true, false).unwrap();
        let lines: HashSet<u32> = [2u32].into_iter().collect();
        let n = replace_in_file(&p, &re, "X", false, Some(&lines)).unwrap();
        assert_eq!(n, 1);
        assert_eq!(read(&p), "foo\nX\nfoo\n");
        std::fs::remove_file(&p).ok();
    }

    #[test]
    fn regex_capture_expansion() {
        let p = temp("caps", "name: alice\nname: bob\n");
        let re = build_regex(r"name: (\w+)", true, true).unwrap();
        let n = replace_in_file(&p, &re, "$1 <-", true, None).unwrap();
        assert_eq!(n, 2);
        assert_eq!(read(&p), "alice <-\nbob <-\n");
        std::fs::remove_file(&p).ok();
    }

    #[test]
    fn literal_replacement_does_not_expand_dollar() {
        let p = temp("dollar", "price\n");
        let re = build_regex("price", true, false).unwrap();
        // In literal mode `$1` is inserted verbatim, not treated as a group.
        let n = replace_in_file(&p, &re, "$1", false, None).unwrap();
        assert_eq!(n, 1);
        assert_eq!(read(&p), "$1\n");
        std::fs::remove_file(&p).ok();
    }

    #[test]
    fn no_match_leaves_file_untouched() {
        let p = temp("nomatch", "hello\n");
        let re = build_regex("zzz", true, false).unwrap();
        let n = replace_in_file(&p, &re, "X", false, None).unwrap();
        assert_eq!(n, 0);
        assert_eq!(read(&p), "hello\n");
        std::fs::remove_file(&p).ok();
    }
}
