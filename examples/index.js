const path = require('path');
const fs = require('fs');
const {
  download,
  parse,
  findByAddress,
  findByComponents,
  findByZipcode
} = require('../dist/cjs/index.js');

const divider = () => console.log(Array.from({ length: 50 }).map(() => '─').join(''));

function main () {
  // download utf_all.csv
  const csvFilePath = path.join(__dirname, 'utf_all.csv');
  if (!fs.existsSync(csvFilePath)) {
    download(__dirname);
  }
  console.log(`downloaded: ${csvFilePath}`);
  divider();

  // parse csv
  const data = parse(fs.readFileSync(csvFilePath, 'utf8'));
  console.log('parsed data (0-2): ', data.slice(0, 3));
  divider();

  // save json
  const jsonFilePath = path.join(__dirname, 'data.json');
  fs.writeFileSync(jsonFilePath, JSON.stringify(data));
  console.log(`saved: ${jsonFilePath}`);
  divider();

  // find by zipcode
  const findByZipcodeResult = findByZipcode('1000001', data);
  console.log('findByZipcodeResult: ', findByZipcodeResult);
  divider();

  // find by address
  const findByAddressResult = findByAddress('東京都千代田区千代田１−１', data);
  console.log('findByAddressResult: ', findByAddressResult);
  divider();

  // find by components
  const findByComponentsResult = findByComponents(['東京都', '港区', '芝公園'], data);
  console.log('findByComponentsResult: ', findByComponentsResult);
}

main();
