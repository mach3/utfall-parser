import { download, findByAddress, findByComponents, findByZipcode, parse, similaritySort } from '../src';
import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(__dirname, 'utf_all.csv');

const DATA = ((): any => {
  if (!fs.existsSync(CSV_PATH)) {
    download(__dirname);
  }
  return parse(fs.readFileSync(CSV_PATH, 'utf-8'));
})();

function getType (obj: any): string {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

// ダウンロードしたファイルが存在すること
test('downloaded file exists', () => {
  fs.existsSync(path.join(__dirname, 'utf_all.csv'));
});

// ダウンロードしたファイルをパースできること
test('parse downloaded data', () => {
  const it = DATA.find((it: any) => it.notes !== undefined);
  // successfully parsed
  expect(getType(DATA)).toBe('Array');
  expect(DATA.length).toBeGreaterThan(9999);

  // appropriate data type
  expect(getType(it)).toBe('Object');
  expect(getType(it.zipcode)).toBe('String');
  expect(getType(it.pref)).toBe('String');
  expect(getType(it.components)).toBe('Array');
  expect(it.components.every((it: any) => getType(it) === 'String')).toBe(true);
  expect(getType(it.address)).toBe('String');
  expect(getType(it.notes)).toBe('String');
});

// 重複データがないこと
// NOTE: 重複データと見られるのは実際は重複ではないのだが（ 6730012 兵庫県明石市和坂 ）
//       読み方が違うだけなのでここでは重複とみなしている
test('doesnt have dupulicated data', () => {
  const tmp: string[] = DATA.map((it: any) => JSON.stringify(it));
  const uniq = [...new Set(tmp)];
  expect(uniq.length).toBe(DATA.length);
});

// 郵便番号を指定してデータを取得できること
test('find by zipcode', () => {
  const r: any[] = [
    findByZipcode('1000001', DATA),
    findByZipcode('１０００００１', DATA),
    findByZipcode('100-0001', DATA),
    findByZipcode('100', DATA),
    findByZipcode('foo', DATA)
  ];
  expect(r[0].length).toBe(1);
  expect(r[0][0].pref).toBe('東京都');
  expect(JSON.stringify(r[1])).toBe(JSON.stringify(r[0]));
  expect(JSON.stringify(r[2])).toBe(JSON.stringify(r[0]));
  expect(r[3].length).toBeGreaterThan(100);
  expect(r[3].includes(r[0][0])).toBe(true);
  expect(r[4]).toBeInstanceOf(Error);
});

// 住所を指定してデータを取得できること
test('find by address', () => {
  const r: any[] = [
    findByAddress('', DATA),
    findByAddress('foobar', DATA),
    findByAddress('東京都港区', DATA),
    findByAddress('藤沢市大庭5', DATA)
  ];

  expect(r[0]).toBeInstanceOf(Error);
  expect(r[1].length).toBe(0);
  expect(r[2].length).toBeGreaterThan(0);
  expect(r[2][0].pref).toBe('東京都');
  expect(r[2][0].components.includes('東京都')).toBe(true);
  expect(r[3].length).toBeGreaterThan(0);
});

// 住所部品を指定してデータを取得できること
test('find by components', () => {
  const r: any[] = [
    findByComponents([], DATA),
    findByComponents([''], DATA),
    findByComponents(['foobar'], DATA),
    findByComponents(['東京都', '港区'], DATA),
    findByComponents(['神奈川県', '東京都'], DATA),
    findByComponents(['神奈川県', '東京都'], DATA, true)
  ];

  expect(r[0]).toBeInstanceOf(Error);
  expect(r[1]).toBeInstanceOf(Error);
  expect(r[2].length).toBe(0);
  expect(r[3].length).toBeGreaterThan(0);
  expect(r[4].length).toBe(0);
  expect(r[5].length).toBeGreaterThan(0);
});

// 2023/2/26現在、「一つの郵便番号で二以上の町域を表す場合の表示」が 1 だが複数行に渡るケースであり、
// さらに対象の郵便番号が示す町域は同じ市内にあるため、正常にパースできていなかった
// その対応をこのテストで検証する
test('Edge Case : 9218046', () => {
  const r = findByZipcode('9218046', DATA) as any[];
  expect(r.length).toBe(2);
});

// 類似度でソート
test('sort by similarity', async () => {
  const SAMPLE_DATA = JSON.parse('[{"zipcode":"1140000","pref":"東京都","components":["東京都","北区"],"address":"北区"},{"zipcode":"5300000","pref":"大阪府","components":["大阪府","大阪市北区"],"address":"大阪市北区"},{"zipcode":"5300057","pref":"大阪府","components":["大阪府","大阪市北区","曽根崎"],"address":"大阪市北区曽根崎"},{"zipcode":"5300002","pref":"大阪府","components":["大阪府","大阪市北区","曽根崎新地"],"address":"大阪市北区曽根崎新地"}]');
  const r = similaritySort('大阪府大阪市北区曽根崎', SAMPLE_DATA);
  expect(r[0].zipcode).toBe('5300057');
  expect(r[3].zipcode).toBe('1140000');
});
