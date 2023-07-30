import axios from "axios";
import { parse } from "node-html-parser";
import utils from "./utils.js"
import db from "./db.js";

const logger = utils.logger;

/**
 * @param name Name of the store
 * @param url URL of the store
 * 
 * @function `configureURL` Configure the URL to scrape
 * @function `getProductsHTML` Get the products from the HTML
 * 
 * @function `configureRequest` Configure the request to send
 * @function `getProductsXML` Get the products from the XML
 * 
 * @function `configureRequest` Configure the request to send
 * @function `getProductsHTML` Get the products from the HTML
 */
class Store {
    
    // Public variables
    public name: string;
    public url: URL;

    // Private Variables
    private fName: string;
    private base: string;
    private defaultHeaders: { [key: string]: string };
    private toWrite: any[] = [];
    private pages: boolean = false;
    private maxPages: number = 12;
    private urlConfig: { pages?: boolean; maxPages?: number; limit?: boolean; mainSelector: string; nameSelector: string; priceSelector: string; trim?: string; };
    private requestConfig: { headers: { [key: string]: string; }; payload: string; };

    // Constructor
    public constructor({ name, url }: { name: string; url: URL; }) {
        this.name = name;
        this.fName = name.toLowerCase().replace(" ", "-");
        this.url = url;
        this.defaultHeaders = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1660.9" }
    }

    public async run() {
        if (this.base === "url") await this.getProductsHTML(this.urlConfig);
        if (this.base === "request") await this.getProductsXML(this.requestConfig);
        await this.compare();
    }

    // Configure URL Base
    public configureURL({ pages = false, maxPages = 12, limit = false, mainSelector, nameSelector, priceSelector, trim = "" }: { pages?: boolean; maxPages?: number; limit?: boolean; mainSelector: string; nameSelector: string; priceSelector: string;trim?: string }): Store {
        if (pages) {
            this.url.searchParams.set("page", "1");
            this.pages = true;
            this.maxPages = maxPages;
        };
        if (limit) this.url.searchParams.set("limit", "10000");
        this.urlConfig = { pages, maxPages, limit, mainSelector, nameSelector, priceSelector, trim };
        this.base = "url";
        return this;
    }

    // Configure Request Base
    public configureRequest({ headers = this.defaultHeaders, payload }: { headers: { [key: string]: string; }; payload: string; }) {
        this.base = "request";
    }

    // Get Products | Expects HTML Response
    public async getProductsHTML({ mainSelector, nameSelector, priceSelector, trim = "" }: { mainSelector: string; nameSelector: string; priceSelector: string;trim?: string }) {
        await db.drop(this.fName);
        if (this.pages) {
            console.log("Pages: " + this.maxPages)
            const promises = [];
            for (let page = 1; page <= this.maxPages; page++) {
                let promise = (async () => {
                    if (logger) console.log("Page: " + page);
                    this.url.searchParams.set("page", page.toString());
                    try {
                        let root = parse((await axios.get(this.url.toString())).data);
                        let products = root.querySelectorAll(mainSelector);
                        this.toWrite = this.toWrite.concat(...await this.getProductInfoHTML({ products, nameSelector, priceSelector, trim }));
                    } catch (error) {
                        if (logger) console.log(error);
                        this.pages = false;
                    }
                })();
                promises.push(promise);
            }
            await Promise.all(promises);
        }
        else {
            let root = parse((await axios.get(this.url.toString())).data);
            let products = root.querySelectorAll(mainSelector);
            this.toWrite = this.toWrite.concat(...await this.getProductInfoHTML({ products, nameSelector, priceSelector }));
        }
        await db.write(this.fName, this.toWrite);
    }

    // Get Product Info | Expects HTML Response
    public async getProductInfoHTML({ products, nameSelector, priceSelector, trim = "" }: { products: any[]; nameSelector: string; priceSelector: string; trim?: string; }): Promise<{ name: any; price: any; }[]> {
        let data = products.map((product) => {
            return {
                name: product.querySelector(nameSelector).innerText.trim().replace(trim, ""),
                price: product.querySelector(priceSelector).innerText.trim().match(/\d{1,2}.\d{2}/)[0]
            }
        });
        return data;
    }

    // Get Products | Expects X<L Response
    public async getProductsXML({ headers, payload }: { headers: { [key: string]: string; }; payload: string; }) {

    }

    // Get Product Info | Expects JSON Response
    public async getProductInfoXML() {

    }

    // Compare Against Jellycat Database
    public async compare() {
        let comparedToWrite = [];
        let jellycats = await db.read("jellycat")
        jellycats.forEach((jellycat) => {
            let found = this.toWrite.find((item) => item.name === jellycat.name);
            if (found) {
                comparedToWrite.push({
                    name: jellycat.name,
                    price: found.price
                });
            }
        });
        await db.write("compared", comparedToWrite)
        if (logger) console.log(`Done writing ${this.name} Compare to Database!`);
        return this;
    }
}

export default Store;