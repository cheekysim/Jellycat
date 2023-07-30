import axios from "axios";
import { parse } from "node-html-parser";
import utils from "./utils.js"
import db from "./db.js";

const logger = utils.logger;

let toWrite = [];

export async function shopwales() {
    // Drop shopwales collection
    await db.drop("shop-wales").catch((error) => { if (logger) {console.log(error)} });

    let promises = [];

    for (let page = 1; page <= 12; page++) {
        promises.push(get(page).then((data: { name: string, price: string }[]) => {
            // Format data
            data.map((item: { name: string, price: string | number }) => {
                item.name = utils.title(item.name.toLowerCase().replace(" by jellycat", "").replace("  ", ""));
                if (typeof item.price === "string") item.price = parseFloat(item.price.match(/\d{1,2}.\d{2}/g)[0]);
            });
            toWrite.push(...data);
        }));
    }

    await Promise.all(promises);

    await db.write("shop-wales", toWrite);
    if (logger) {console.log("Done writing Shop-Wales to Database!")};
    await compare();
}


async function get(page: number = 1) {
    return axios.get(`https://shopwales.co.uk/collections/all-jellycat?page=${page}`)
        .then((response) => {
            let root = parse(response.data);
            let products = root.querySelectorAll('ul#product-grid > li.grid__item');
            let data = products.map((product) => {
                return {
                    name: product.querySelector('a.full-unstyled-link').innerText.trim(),
                    price: product.querySelector('div.price > div > div.price__regular > span.price-item').innerText.trim()
                }
            });
            return data;
        })
        .catch((error) => {
            if (logger) {console.log(error)};
        })
}

async function compare() {
    let comparedToWrite = [];
    let jellycats = await db.read("jellycat")
    jellycats.forEach((jellycat) => {
        let found = toWrite.find((item) => item.name === jellycat.name);
        if (found) {
            comparedToWrite.push({
                name: jellycat.name,
                price: found.price,
                year: jellycat.year,
                store: "Shop-Wales",
                image: jellycat.image
            });
        }
    });
    await db.write("compared", comparedToWrite);
    if (logger) {console.log("Done writing Shop-Wales Compared to Database!")};
}