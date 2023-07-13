import { MongoClient } from 'mongodb';
import utils from './utils.js'
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const logger = utils.logger;

const pass = utils.decrypt({iv: fs.readFileSync('iv', 'utf8'), key: fs.readFileSync('key', 'utf8'), encryptedData: process.env.DBPASS})
const newEncryption = utils.encrypt(pass);

// Store new encryption
fs.writeFile('iv', newEncryption.iv, (err) => {if (logger && err) console.log(err)});
fs.writeFile('key', newEncryption.key, (err) => {if (logger && err) console.log(err)});
utils.updateDotEnv('DBPASS', newEncryption.encryptedData);

const ip = "localhost"
const url = new URL(`mongodb://${process.env.DBUSER}:${pass}@${ip}:27017/jellycats?authMechanism=DEFAULT&authSource=admin`);
const client = new MongoClient(url.toString());
if (logger) {console.log(`Connected to MongoDB`)}

export default {
    read: read,
    write: write,
    drop: drop,
    close: close,
    collectionExists: collectionExists
}

async function read(Collection: string, query: any = {}, sort: any = {}) {
    if (logger) console.log(`Reading ${Collection}...`);
    let con = await client.connect();
    let collection = con.db("jellycats").collection(Collection);
    return await collection.find(query).sort(sort).toArray();
}

async function write(Collection: string, data: any[]) {
    if (data.length === 0) { if (logger) console.log(`No data to write to ${Collection}`); return };
    if (logger) console.log(`Writing ${Collection}...`);
    let con = await client.connect();
    let collection = con.db("jellycats").collection(Collection);
    if (! await collectionExists(Collection)) {
        await con.db("jellycats").createCollection(Collection);
    }
    return await collection.insertMany(data);
}

async function drop(Collection: string) {
    if (logger) console.log(`Dropping ${Collection}...`);
    let con = await client.connect();
    if (await collectionExists(Collection)) {
        return await con.db("jellycats").collection(Collection).drop();
    } else {
        return false;
    }
}

async function close() {
    await client.close();
    if (logger) {console.log("Disconnected from MongoDB");}
}

async function collectionExists(Collection: string) {
    const con = await client.connect();
    let collections = (await con.db("jellycats").listCollections().toArray()).map((collection) => collection.name);
    return collections.includes(Collection);
}