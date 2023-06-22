const request = require("supertest");

const app = require("../app");
const db = require("../db");

beforeEach(async function createData() {
    await db.query("DELETE FROM invoices");
    await db.query("DELETE FROM companies");
    await db.query("SELECT setval('invoices_id_seq', 1, false)");
  
    await db.query(`INSERT INTO companies (code, name, description)
                      VALUES ('apple', 'Apple', 'Maker of OSX.'),
                             ('ibm', 'IBM', 'Big blue.')`);
  
    const inv = await db.query(
          `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
             VALUES ('apple', 100, false, '2018-01-01', null),
                    ('apple', 200, true, '2018-02-01', '2018-02-02'), 
                    ('ibm', 300, false, '2018-03-01', null)
             RETURNING id`);
  });

afterAll(async () => {
    await db.end();
})

describe("GET /", () => {
    test("Returns array of companies", async () => {
        let resp = await request(app).get("/companies");
        expect(resp.body).toEqual({
            "companies": [
                {code: "apple", name: "Apple"},
                {code: "ibm", name: "IBM"}
            ]
        })
    })
});


describe("GET /apple", () => {
    test("Returns specific company info", async () => {
        let resp = await request(app).get("/companies/apple");
        expect(resp.body).toEqual({
            "company": {
                code: "apple",
                name: "Apple",
                description: "Maker of OSX.",
                invoices: [1, 2],
            }
        })
    })
    test("Returns 404 error if company not found", async () => {
        let resp = await request(app).get("/companies/test");
        expect(resp.status).toEqual(404);
    })
});

describe("POST /", () => {
    test("Adds new company and returns it", async () => {
        let resp = await request(app).post("/companies")
        .send({name: "TestCompany", description: "test"});
        expect(resp.body).toEqual({
            "company": {
                 code: "testcompany",
                 name: "TestCompany",
                 description: "test"
                },
        })
    })
    test("Returns 500 error if there is an issue", async () => {
        let resp = await request(app).post("/companies")
        .send({name: "IBM", description: "test"});
        expect(resp.status).toEqual(500);
    })
});

describe("PUT /", () => {
    test("Updates specific company", async () => {
        let resp = await request(app).put("/companies/ibm")
        .send({name: "IBMTest", description: "test"});

        expect(resp.body).toEqual({
            "company": {
                code: "ibm",
                name: "IBMTest",
                description: "test"
            }
        })
    });
    test("Returns 404 error if company not found", async () => {
        let resp = await request(app).put("/companies/test")
        .send({name: "Test"});

        expect(resp.status).toEqual(404);
    })
    test("Returns 500 error if there is data missing", async () => {
        let resp = await request(app).put("/companies/ibm")
        .send({});
        expect(resp.status).toEqual(500);
    })
})

describe("DELETE /", () => {
    test("Deletes specific company", async () => {
        let resp = await request(app).delete("/companies/apple");
        expect(resp.body).toEqual({"status": "DELETED"})
    })
    test("Returns 404 error if company not found", async () => {
        let resp = await request(app).delete("/companies/test");
        expect(resp.status).toEqual(404);
    })
});