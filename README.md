# utfall-parser

`KEN_ALL.csv` の後継版である `utf_all.csv` をパースする node.js 用ライブラリです。  
パースしたデータを元にして郵便番号から、あるいは住所文字列から住所レコードを検索することができます。

ref: https://www.post.japanpost.jp/zipcode/download.html

## API

### `AddressItem`

住所レコードの型です。

```typescript
interface AddressItem {
  zipcode: string
  pref: string
  components: string[]
  address: string
  notes?: string
}
```

### `download`

```typescript
download(
  destDir: string = './',
  url: string = 'https://www.post.japanpost.jp/zipcode/utf_all.csv'
): string
```

指定された URL からファイルをダウンロードし、指定されたディレクトリに保存します。  
保存されたファイルのパスを返します。

### `parse`

```typescript
parse( csvString: string ): AddressItem[]
```

指定された CSV 文字列をパースし、住所レコードの配列を返します。

### `findByZipcode`

```typescript
findByZipcode(
  zipcode: string,
  data: AddressItem[]
): AddressItem[] | Error
```

指定された郵便番号と一致または前方一致する住所レコードを検索します。  
不正な郵便番号が指定された場合は `Error` を返します。

### `findByAddress`

```typescript
findByAddress(
  address: string,
  data: AddressItem[],
  sort: boolean = true
): AddressItem[] | Error
```

指定された住所文字列と部分一致する住所レコードを検索します。
`sort` が `true` の場合は、類似度が高い順にソートされた配列を返します。（初期値は `true`）

### `findByComponents`

```typescript
findByComponents(
  components: string[],
  data: AddressItem[],
  isOr: boolean = false 
): AddressItem[] | Error
```

指定された住所要素の配列に一致する住所レコードを検索します。  
`isOr` が `true` の場合は、OR検索を行います。（初期値は `false` でAND検索）

## Example

```js
// 現在のディレクトリにファイルをダウンロード
const csvFilePath = download(__dirname);

// ファイルを読み込み、パースする
const data = parse(fs.readFileSync(csvFilePath, 'utf-8'));

// データから郵便番号で検索
const zipcodeResult = findByZipcode('1000001', data);

// データから住所文字列で検索
const addressResult = findByAddress('東京都千代田区千代田', data);

// データから住所要素で検索
const componentsResult = findByComponents(['東京都', '千代田区', '千代田'], data);
```