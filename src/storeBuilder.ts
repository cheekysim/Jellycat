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
    private defaultHeaders: { [key: string]: string };
    private toWrite: any[] = [];
    private maxPages: number | null = null;

    // Constructor
    public constructor({ name, url }: { name: string; url: URL; }) {
        this.name = name;
        this.url = url;
        this.defaultHeaders = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1660.9" }
    }

    // Configure URL Base
    public async configureURL({ maxPages = null, limit = null }: { maxPages?: number | null; limit?: number | null; }): Promise<void> {
        if (maxPages) {
            this.url.searchParams.set("page", "1");
            this.maxPages = maxPages;
        };
        if (limit) this.url.searchParams.set("limit", limit.toString());
    }

    // Configure Request Base
    public async configureRequest({ headers = this.defaultHeaders, payload }: { headers: { [key: string]: string; }; payload: string; }): Promise<void> {

    }

    // Get Products | Expects HTML Response
    public async getProductsHTML({ mainSelector, nameSelector, priceSelector }: { mainSelector: string; nameSelector: string; priceSelector: string; }): Promise<void> {
        if (this.maxPages) {
            for (let page = 1; page <= this.maxPages; page++) {
                this.url.searchParams.set("page", page.toString());
                let root = parse((await axios.get(this.url.toString())).data);
                let products = root.querySelectorAll(mainSelector);
                this.toWrite = this.toWrite.concat(...await this.getProductInfoHTML({ products, nameSelector, priceSelector }));
            }
        }
        else {
            let root = parse((await axios.get(this.url.toString())).data);
            let products = root.querySelectorAll(mainSelector);
            this.toWrite = this.toWrite.concat(...await this.getProductInfoHTML({ products, nameSelector, priceSelector }));
        }
    }

    // Get Product Info | Expects HTML Response
    public async getProductInfoHTML({ products, nameSelector, priceSelector, trim = "" }: { products: any[]; nameSelector: string; priceSelector: string; trim?: string; }): Promise<{ name: any; price: any; }[]> {
        let data = products.map((product) => {
            return {
                name: product.querySelector(nameSelector).innerText.trim().replace(trim, ""),
                price: product.querySelector(priceSelector).innerText.trim().match(/\d{1,2}.\d{2}/)
            }
        });
        return data;
    }

    // Get Products | Expects JSON Response
    public async getProductsJSON() {

    }

    // Get Product Info | Expects JSON Response
    public async getProductInfoJSON() {

    }

    // Compare Against Jellycat Database
    public async compare(): Promise<void> {
        let comparedToWrite = [];
        let jellycats = await db.read("jellycat")
        jellycats.forEach((jellycat) => {
            let found = this.toWrite.find((item) => item.name === jellycat.name);
            if (found) {
                comparedToWrite.push({
                    name: jellycat.name,
                    price: jellycat.price,
                    shopWales: found.price
                });
            }
        });
        await db.write("compared", comparedToWrite);
        if (logger) { console.log(`Done writing ${this.name} Compare to Database!`) };
    }
}

export default Store;