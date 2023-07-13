import axios from "axios";
import { parse } from "node-html-parser";
import utils from "./utils.js";
import db from "./db.js";

const logger = utils.logger;

// Set url and headers
let url = new URL("https://v36.nq-api.net/api/v3.5/jellycat-tky2vjme8y/listings")

let headers = {
    "authority": "v36.nq-api.net",
    "accept": "*/*",
    "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
    "content-type": "application/x-www-form-urlencoded",
    "origin": "https://www.jellycat.com",
    "referer": "https://www.jellycat.com/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edg/111.0.1660.9"
}


// Get all rerired Jellycats
export async function jellycat(start: number) {
    // Drop jellycat collection
    await db.drop("jellycat");
    // Data to write after all requests are done
    let toWrite = [];
    // Array of promises to wait for
    let promises = [];
    // Loop through all years
    for (let year = 2010; year <= start; year++) {
        // Push a promise to the array
        promises.push(Promise.resolve().then(async () => {
            // Get the max pages for the year
            // This is used to loop through all pages
            // Then pushes the unpacked data to the toWrite array
            let payload = `clientid=a806caea-f3c5-44cd-bb03-6908f4864f54&pagetype=category&pagekey=jrt${year}&signature=eyJzIjoiYThkODRhODAtYzQzNy00MGZjLWFlZmMtMmYwNzVlMTJmNTRhIiwiYSI6Ik1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMTEuMC4wLjAgU2FmYXJpLzUzNy4zNiBFZGcvMTExLjAuMTY2MC45IiwidSI6IjRiN2Y1YjMzLTFhM2MtNGJkMi1hNWRlLWIwZjQzMTk1ODg5YiIsImQiOiJGcmksIDEwIEZlYiAyMDIzIDE0OjE4OjI3IEdNVCJ9&settings%5Bcolumns%5D=3&settings%5Bdomain%5D=www.jellycat.com&settings%5Bpage%5D=1&tracking%5Buserid%5D=4b7f5b33-1a3c-4bd2-a5de-b0f43195889b`

            let response = await axios.post(url.toString(), payload, { headers: headers });
            let maxpages: number = response.data.manifest.maxpages;
            for (let page = 1; page <= maxpages; page++) {
                let data: any = await get(year, page);
                toWrite.push(...data);
            }
        }));
    }
    // Wait for all promises to resolve
    await Promise.all(promises);
    // Write the data to the csv
    await db.write("jellycat", toWrite);
    if (logger) {console.log("Done writing Jellycats to Database!")};
}


// Get the data for a specific year and page
async function get(year: number = 2023, page: number = 1) {
    // Payload to specify year and page
    let payload = `clientid=a806caea-f3c5-44cd-bb03-6908f4864f54&pagetype=category&pagekey=jrt${year}&signature=eyJzIjoiYThkODRhODAtYzQzNy00MGZjLWFlZmMtMmYwNzVlMTJmNTRhIiwiYSI6Ik1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdpbjY0OyB4NjQpIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMTEuMC4wLjAgU2FmYXJpLzUzNy4zNiBFZGcvMTExLjAuMTY2MC45IiwidSI6IjRiN2Y1YjMzLTFhM2MtNGJkMi1hNWRlLWIwZjQzMTk1ODg5YiIsImQiOiJGcmksIDEwIEZlYiAyMDIzIDE0OjE4OjI3IEdNVCJ9&settings%5Bcolumns%5D=3&settings%5Bdomain%5D=www.jellycat.com&settings%5Bpage%5D=${page}&tracking%5Buserid%5D=4b7f5b33-1a3c-4bd2-a5de-b0f43195889b`

    // Make the request
    return axios.post(url.toString(), payload, { headers: headers })
        .then((response) => {
            // Parse the response
            let root = parse(response.data.html);
            // Get all the listings
            let listings = root.querySelectorAll(".container-cols.page-wrapper.relative-children > div > div > span > a > img");
            // Map the listings to an object
            let data = listings.map((listing) => {
                return {
                    name: listing.getAttribute("alt"),
                    year: year,
                    image: listing.getAttribute("src")
                }
            })
            return data;
        })
        .catch((error) => {
            if (logger) {console.log(error)};
        });
}