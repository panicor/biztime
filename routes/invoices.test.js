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
    test("Returns array of invoices", async () => {
        let resp = await request(app).get("/invoices");
        expect(resp.body).toEqual({
            "invoices": [
                {id: 1, comp_code:"apple"},
                {id: 2, comp_code:"apple"},
                {id: 3, comp_code:"ibm"}
            ]
        })
    })
});

describe("GET /1", () => {
    test("Returns specific invoice info", async () => {
        let resp = await request(app).get("/invoices/1");
        expect(resp.body).toEqual({
            "invoice": {
                id: 1,
                amt: 100,
                add_date: '2018-01-01T05:00:00.000Z',
                paid: false,
                paid_date: null,
                company: {
                  code: 'apple',
                  name: 'Apple',
                  description: 'Maker of OSX.',
                }
            }
        })
    })
    test("Returns 404 error if invoice not found", async () => {
        let resp = await request(app).get("/invoices/0");
        expect(resp.status).toEqual(404);
    })
});

describe("POST /", () => {
    test("Adds new invoice and returns it", async () => {
        let resp = await request(app).post("/invoices")
        .send({amt: 2, comp_code: "apple"});

        expect(resp.body).toEqual({
            "invoice": {
                id: 4,
                comp_code: "apple",
                amt: 2,
                add_date: expect.any(String),
                paid: false,
                paid_date: null,
              }
        })
    })
});

describe("PUT /", () => {
    test("Updates specific invoice", async () => {
        let resp = await request(app).put("/invoices/1")
        .send({amt:3, paid: false});

        expect(resp.body).toEqual({
            "invoice": {
                id: 1,
                comp_code: 'apple',
                paid: false,
                amt: 3,
                add_date: expect.any(String),
                paid_date: null,
              }
        })
    });
    test("Returns 404 error if invoice not found", async () => {
        let resp = await request(app).put("/invoices/0").send({amt: 4});

        expect(resp.status).toEqual(404);
    })
    test("Returns 500 error if there is data missing", async () => {
        let resp = await request(app).put("/invoices/1")
        .send({});
        expect(resp.status).toEqual(500);
    })
})

describe("DELETE /", () => {
    test("Deletes specific invoice", async () => {
        let resp = await request(app).delete("/invoices/1");
        expect(resp.body).toEqual({"status": "DELETED"})
    })

    test("Returns 404 error if invoice not found", async () => {
        let resp = await request(app).delete("/invoices/0");
        expect(resp.status).toEqual(404);
    })
});

