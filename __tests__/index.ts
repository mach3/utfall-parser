import { cleanAddress, download, find, findByAddress, findByComponents, findByZipcode, parse, parseZipcode, similaritySort } from '../src';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, 'data');
const CSV_PATH = path.join(DATA_DIR, 'utf_ken_all/utf_ken_all.csv');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const DATA = ((): any => {
  if (!fs.existsSync(CSV_PATH)) {
    download(DATA_DIR);
  }
  return parse(fs.readFileSync(CSV_PATH, 'utf-8'));
})();

const RAW_DATA = ((): any => {
  return fs.readFileSync(CSV_PATH, 'utf-8')
    .split('\n')
    .filter(it => it)
    .map((it: string) => (it.split(',')));
})();

function getType (obj: any): string {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

// ダウンロードしたファイルが存在すること
test('downloaded file exists', () => {
  expect(
    fs.existsSync(CSV_PATH)
  ).toBe(true);
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

// 正しい郵便番号が判別できること
test('test whether value is like zipcode', () => {
  expect(parseZipcode('１２３４５６７')).toBe('1234567');
  expect(parseZipcode('12')).toBe(null);
  expect(parseZipcode('12345678')).toBe(null);
  expect(parseZipcode('123abcd')).toBe(null);
  expect(parseZipcode('1234abc')).toBe('1234');
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

// 任意の値をわたしてデータを取得できること
test('find by query', () => {
  const r: any[] = [
    find('123', DATA),
    find('1000001', DATA),
    find('東京都　芝公園', DATA),
    find('東京都　芝公園', DATA, { isOr: true }),
    find(['東京都', '芝公園'], DATA, { isOr: true }),
    find('東京都千代田区千代田', DATA),
    find('東京都千代田区千代田', DATA, { sort: false })
  ];

  expect(r[0].length).toBeGreaterThan(1);
  expect(r[1][0].address.includes('千代田区千代田')).toBe(true);
  expect(r[2].length).toBeGreaterThan(0);
  expect(r[2][0].zipcode).toBe('1050011');
  expect(r[3].length).toBeGreaterThan(r[2].length);
  expect(r[4].length).toBe(r[3].length);
  expect(r[5][0].zipcode).toBe('1000001');
  expect(r[6][0].zipcode).toBe('1000000');
});

// 2023/2/26現在、「一つの郵便番号で二以上の町域を表す場合の表示」が 1 だが複数行に渡るケースであり、
// さらに対象の郵便番号が示す町域は同じ市内にあるため、正常にパースできていなかった
// その対応をこのテストで検証する
test('Edge Case : 9218046', () => {
  const r = findByZipcode('9218046', DATA) as any[];
  expect(r.length).toBe(2);
});

// 括弧 "（）" の外で "～" および "、" が住所文字列に含まれている場合は notes に逃がす対応をする
test('Edge Case : 7900054, 7910056', () => {
  RAW_DATA
    .filter((row: string[]) => {
      const address = cleanAddress(row[8]);
      const m = address.match(/(.+)（(.+?)）/);
      if (m !== null) {
        return /[、〜]/.test(m[1]);
      }
      if (!address.includes('（')) {
        return /[、〜]/.test(address);
      }
      return false;
    }).map((row: string[]) => {
      return {
        zipcode: row[2].replace(/"/g, ''),
        street: row[8].replace(/"/g, '')
      };
    }).forEach((row: any) => {
      const r = findByZipcode(row.zipcode, DATA) as any[];
      expect(r.some(it => it.notes === row.street)).toBe(true);
    });

  expect(findByAddress('、', DATA)).toStrictEqual([]);
  expect(findByAddress('〜', DATA)).toStrictEqual([]);
});

// 類似度でソート
test('sort by similarity', async () => {
  const SAMPLE_DATA = JSON.parse('[{"zipcode":"1140000","pref":"東京都","components":["東京都","北区"],"address":"北区"},{"zipcode":"5300000","pref":"大阪府","components":["大阪府","大阪市北区"],"address":"大阪市北区"},{"zipcode":"5300057","pref":"大阪府","components":["大阪府","大阪市北区","曽根崎"],"address":"大阪市北区曽根崎"},{"zipcode":"5300002","pref":"大阪府","components":["大阪府","大阪市北区","曽根崎新地"],"address":"大阪市北区曽根崎新地"}]');
  const r = similaritySort('大阪府大阪市北区曽根崎', SAMPLE_DATA);
  expect(r[0].zipcode).toBe('5300057');
  expect(r[3].zipcode).toBe('1140000');
});

// BugFix: 住所のprefixがmultipleではなく、かつ括弧内がmultipleである場合の出力が正しくない
// 例: 1050022: 東京都港区海岸海岸 になっていて street が重複している
test('BugFix: 1050022', () => {
  const r = findByZipcode('1050022', DATA) as any[];
  expect(r.length).toBe(1);
  expect(r[0].address).toBe('港区海岸');
});

// BugFix: 空文字のコンポーネントが観測されたので除去する
test('BugFix: empty component', () => {
  const r = DATA.filter((it: any) => it.components.includes(''));
  expect(r.length).toBe(0);
});

// Edge Case : 括弧書きで読みがなや別名などが記載されている場合があるので、それを notes に逃がす
test('Edge Case : 4740057', () => {
  // 対象の住所のリスト
  const target = RAW_DATA.filter((row: string[]) => {
    return /（[ア-ン]+?）/.test(row[8]);
  }).map((row: string[]) => {
    return [
      row[2].replace(/"/g, ''),
      row[8].replace(/"/g, '')
    ];
  });

  // 住所がカタカナで終わってなければOKとする
  const result = target.filter((row: string[]) => {
    const res = (findByZipcode(row[0], DATA) as any[])
      .filter((it: any) => {
        return /[ア-ン]+$/.test(it.address);
      });
    return res.length > 0;
  });

  expect(result.length).toBe(0);
});
