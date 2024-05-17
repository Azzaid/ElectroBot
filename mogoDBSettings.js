johanasazzaid
UJdfaaCS5NjAPKGB

89.64.55.151

npm install mongodb

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://johanasazzaid:UJdfaaCS5NjAPKGB@tpcwhiteblacklist.fsgf4va.mongodb.net/?retryWrites=true&w=majority&appName=TPCWhiteBlackList";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        const db = client.db("TPCWhiteBlackList");
        const col = db.collection("works");

        const p = await col.insertMany(peopleDocuments);
        // Find the document
        const filter = { "name.last": "Turing" };
        const document = await col.findOne(filter);
        // Print results
        console.log("Document found:\n" + JSON.stringify(document));
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        myColl.find({}); // empty query
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);