export const WORDS = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come",
  "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want", "because",
  "any", "these", "give", "day", "most", "us", "between", "need", "large",
  "often", "hand", "high", "place", "hold", "turn", "found", "still",
  "learn", "plant", "cover", "food", "sun", "four", "between", "state",
  "keep", "never", "start", "city", "earth", "eyes", "light", "thought",
  "head", "under", "story", "saw", "left", "don", "few", "while", "along",
  "might", "close", "something", "seem", "next", "hard", "open", "example",
  "begin", "life", "always", "those", "both", "paper", "together", "got",
  "group", "often", "run", "important", "until", "children", "side", "feet",
  "car", "mile", "night", "walk", "white", "sea", "began", "grow", "took",
  "river", "four", "carry", "state", "once", "book", "hear", "stop", "without",
  "second", "later", "miss", "idea", "enough", "eat", "face", "watch", "far",
  "indian", "really", "almost", "let", "above", "girl", "sometimes", "mountain",
  "cut", "young", "talk", "soon", "list", "song", "being", "leave", "family",
  "body", "music", "color", "stand", "sun", "questions", "fish", "area", "mark",
  "dog", "horse", "birds", "problem", "complete", "room", "knew", "since",
  "ever", "piece", "told", "usually", "didn", "friends", "easy", "heard",
  "order", "red", "door", "sure", "become", "top", "ship", "across", "today",
  "during", "short", "better", "best", "however", "low", "hours", "black",
  "products", "happened", "whole", "measure", "remember", "early", "waves",
  "reached", "listen", "wind", "rock", "space", "covered", "fast", "several",
  "hold", "himself", "toward", "five", "step", "morning", "passed", "vowel",
];

export function getRandomWords(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return result;
}
