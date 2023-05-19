import { jellycat } from "./jellycat.js";
import { shopwales } from "./shop-wales.js"
import { thevillagegiftbox } from "./thevillagegiftbox.js";
import utils from './utils.js'
import db from "./db.js";
import Store from "./storeBuilder.js";

const logger = utils.logger;

main();

async function main() {
    let year = new Date().getFullYear();
    // Check if jellycat db is up to date
    let jellycatYears = (await db.read("jellycat")).map((jellycat) => jellycat.year);
    if (!jellycatYears.includes(year)) {
        // If not, update it
        if (logger) {console.log("Jellycat DB is out of date, updating...")};
        await jellycat(year);
    }
    if (logger) {console.log("Jellycat Database read!\nScraping Shops...")};
    // Drop compared collection
    await db.drop("compared")
    // Trigger every web scraper
    const shopwalesurl = new URL("https://shopwales.co.uk/collections/all-jellycat")
    const shopwales = new Store({name: "Shop Wales", url: shopwalesurl})
    shopwales.configureURL({
        pages: true,
        maxPages: 14,
        mainSelector: "ul#product-grid > li.grid__item",
        nameSelector: "a.full-unstyled-link",
        priceSelector: "div.price > div > div.price__regular > span.price-item",
        trim: " by jellycat"})
    console.log("All Config Done")
    await scrape([shopwales])
    // let shops = [shopwales.compare()]
    // await Promise.all(shops);
    // thevillagegiftbox();
    await db.close();
}

async function scrape(stores : Store[]) {
    stores.forEach((store) => {
        if (logger) console.log(`Scraping: ${store.name}`)
        store.run();
    })
}