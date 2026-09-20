export type TermHalf = "H1" | "H2";

export type Term = {
  year: number;
  half: TermHalf;
};

export function termFromDate(d = new Date()): Term {
  const year = d.getFullYear();
  const half: TermHalf = d.getMonth() < 6 ? "H1" : "H2";
  return { year, half };
}

export function nextTerm(term: Term): Term {
  if (term.half === "H1") return { year: term.year, half: "H2" };
  return { year: term.year + 1, half: "H1" };
}

export function prevTerm(term: Term): Term {
  if (term.half === "H2") return { year: term.year, half: "H1" };
  return { year: term.year - 1, half: "H2" };
}

export function termKey(term: Term) {
  return `${term.year}-${term.half}`;
}

export function sameTerm(a: Term, b: Term) {
  return a.year === b.year && a.half === b.half;
}

export function termLabel(term: Term) {
  return `${term.year}년 ${term.half === "H1" ? "상반기" : "하반기"}`;
}
