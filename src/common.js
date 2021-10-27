import {parshiot} from '@hebcal/core';
import numverses from './numverses.json';

/**
 * Names of the books of the Torah. BOOK[1] === 'Genesis'
 */
export const BOOK = ['', 'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];

export const doubled = [
  21, // Vayakhel-Pekudei
  26, // Tazria-Metzora
  28, // Achrei Mot-Kedoshim
  31, // Behar-Bechukotai
  38, // Chukat-Balak
  41, // Matot-Masei
  50, // Nitzavim-Vayeilech
];

/**
 * takes a 0-based (Bereshit=0) parsha ID
 * @private
 * @param {number} id
 * @return {string}
 */
export function getDoubledName(id) {
  const p1 = parshiot[id];
  const p2 = parshiot[id + 1];
  const name = p1 + '-' + p2;
  return name;
}

/**
 * Represents an aliyah
 * @typedef {Object} Aliyah
 * @property {string} k - Book (e.g. "Numbers")
 * @property {string} b - beginning verse (e.g. "28:9")
 * @property {string} e - ending verse (e.g. "28:15")
 * @property {number} [v] - number of verses
 * @property {number} [p] - parsha number (1=Bereshit, 54=Vezot HaBracha)
 */

/**
 * A bit like Object.assign(), but just a shallow copy
 * @private
 * @param {any} target
 * @param {any} source
 * @return {any}
 */
export function shallowCopy(target, source) {
  Object.keys(source).forEach((k) => target[k] = source[k]);
  return target;
}

/**
 * Makes a deep copy of the src object using JSON stringify and parse
 * @private
 * @param {any} src
 * @return {any}
 */
export function clone(src) {
  return JSON.parse(JSON.stringify(src));
}

/**
 * Makes Sefaria links by adding `href`, `verses` and `num` attributes to each aliyah.
 * CAUTION: Modifies the `aliyot` parameter instead of making a copy.
 * @deprecated
 * @param {Object<string,Aliyah>} aliyot aliyah map to decorate
 * @param {boolean} showBook display the book name in the `verses` field (e.g. for special Maftir)
 */
export function addSefariaLinksToLeyning(aliyot, showBook) {
  const book1 = aliyot['1'] && aliyot['1'].k;
  Object.keys(aliyot).forEach((num) => {
    const aliyah = aliyot[num];
    aliyah.num = num == 'M' ? 'maf' : num;
    const begin = aliyah.b.split(':');
    const end = aliyah.e.split(':');
    const endChapVerse = begin[0] === end[0] ? end[1] : aliyah.e;
    const verses = `${aliyah.b}-${endChapVerse}`;
    aliyah.verses = showBook || (book1 != aliyah.k) ? `${aliyah.k} ${verses}` : verses;
    const sefariaVerses = verses.replace(/:/g, '.');
    const sefAliyot = showBook ? '0' : '1';
    const url = `https://www.sefaria.org/${aliyah.k}.${sefariaVerses}?lang=bi&aliyot=${sefAliyot}`;
    aliyah.href = url;
  });
}

/**
 * @private
 * @param {any} aliyah
 * @return {number}
 */
export function calculateNumVerses(aliyah) {
  if (aliyah.v) {
    return aliyah.v;
  }
  const chapVerseBegin = aliyah.b.split(':');
  const chapVerseEnd = aliyah.e.split(':');
  const c1 = +chapVerseBegin[0];
  const c2 = +chapVerseEnd[0];
  const v1 = +chapVerseBegin[1];
  const v2 = +chapVerseEnd[1];
  if (c1 === c2) {
    aliyah.v = v2 - v1 + 1;
  } else if (typeof aliyah.k === 'string') {
    const numv = numverses[aliyah.k];
    if (typeof numv !== 'object' || !numv.length) {
      throw new ReferenceError(`Can't find numverses for ${aliyah.k}`);
    }
    let total = numv[c1] - v1 + 1;
    for (let chap = c1 + 1; chap < c2; chap++) {
      total += numv[chap];
    }
    total += v2;
    aliyah.v = total;
  }
  return aliyah.v;
}

/**
 * @private
 * @param {any} haftara
 * @return {number}
 */
export function calculateHaftarahNumVerses(haftara) {
  const sections = haftara.split(/[;,]/);
  let total = 0;
  let prevBook;
  sections.forEach((haft) => {
    const matches = haft.trim().match(/^(([^\d]+)\s+)?(\d.+)$/);
    if (matches !== null) {
      const hbook = matches[2] ? matches[2].trim() : prevBook;
      const hverses = matches[3].trim();
      const cv = hverses.match(/^(\d+:\d+)\s*-\s*(\d+(:\d+)?)$/);
      if (cv) {
        if (cv[2].indexOf(':') === -1) {
          const chap = cv[1].substring(0, cv[1].indexOf(':'));
          cv[2] = `${chap}:${cv[2]}`;
        }
        const haft = {k: hbook, b: cv[1], e: cv[2]};
        total += calculateNumVerses(haft);
      } else {
        total++; // Something like "Jeremiah 3:4" is 1 verse
      }
      prevBook = hbook;
    }
  });
  return total || undefined;
}
