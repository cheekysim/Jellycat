import axios from "axios";
import { parse } from "node-html-parser";
import csvWriter from "csv-writer";
import utils from "./utils.js"
import fs from "fs";
import csv from "csv-parser";

const createCsvWriter = csvWriter.createObjectCsvWriter;

let toWrite = [];

export async function thevillagegiftbox() {
    // Create writer for jellycat.csv
    let writer = createCsvWriter({
        path: "csv/thevillagegiftbox.csv",
        header: [
            { id: "name", title: "Name" },
            { id: "price", title: "Price" }
        ]
    });

    let promises = [];

    for (let page = 1; page <= 12; page++) {
        promises.push(get().then((data: { name: string, price: string }[]) => {
            // Format data
            data.map((item: { name: string, price: string }) => {
                item.name = utils.title(item.name.toLowerCase().replace("jellycat ", "").replace("  ", ""));
                item.price = item.price.match(/\d{1,2}.\d{2}/g)[0];
            });
            toWrite.push(...data);
        }));
    }

    await Promise.all(promises);

    await writer.writeRecords(toWrite);
    console.log("Done writing The Village Gift Box to CSV");
    // await compare(new Date().getFullYear());
}


async function get() {
    return axios.get(`https://www.thevillagegiftbox.co.uk/index.php?route=product/search&search=Jellycat&limit=1000`)
        .then((response) => {
            let root = parse(response.data);
            let products = root.querySelectorAll('product-layout product-list');
            console.log(products[0])
            let data = products.map((product) => {
                return {
                    name: product.querySelector('a').getAttribute('title').trim(),
                    price: product.querySelector('.price').innerText.trim()
                }
            });
            return data;
        })
        .catch((error) => {
            console.log(error);
        })
}

async function compare(year: number) {
    let comparedToWrite = [];
    let compared = createCsvWriter({
        path: "csv/compared.csv",
        header: [
            { id: "name", title: "Name" },
            { id: "price", title: "Price" },
            { id: "year", title: "Year"},
            { id: "store", title: "Store" },
            { id: "image", title: "Image" }
        ]
    });
    fs.createReadStream(`csv/jellycat-${year}.csv`)
        .pipe(csv())
        .on('data', (row) => {
            let found = toWrite.find((item) => item.name === row.Name);
            if (found) {
                comparedToWrite.push({
                    name: row.Name,
                    price: found.price,
                    year: row.Year,
                    store: "The Village Gift Shop",
                    image: row.Image
                });
            }
        })
        .on('end', () => {
            compared.writeRecords(comparedToWrite);
            console.log('Shop-Wales Compared')
        });
}