import { jellycat } from "./jellycat.js";
import { shopwales } from "./shop-wales.js"
import { thevillagegiftbox } from "./thevillagegiftbox.js";
import utils from './utils.js'
import db from "./db.js";

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
    let shops = [shopwales()]
    await Promise.all(shops);
    // thevillagegiftbox();
    await db.close();
}