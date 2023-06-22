const express = require("express");
const db = require("../db")
const slugify = require("slugify");
const ExpressError = require("../expressError");

let router = new express.Router();

router.get("/", async (req, res, next) => {
    try{
        let result = await db.query(
            `SELECT code, name FROM companies ORDER BY name`
            );
        
        return res.json({"companies": result.rows})

    }
    catch(e){
        return next(e);
    }
});

router.get("/:code", async (req, res, next) => {
    try{
        let code = req.params.code;

        const companyResult = await db.query(
            `SELECT code, name, description FROM companies WHERE code = $1`, 
            [code]
            );

        const invoiceResult = await db.query(
            `SELECT id FROM invoices WHERE comp_code = $1`, 
            [code]
            );

        if(companyResult.rows.length == 0){
             throw new ExpressError(`No company with code ${code}`, 404);
        }

        const company = companyResult.rows[0];
        const invoices = invoiceResult.rows;

        company.invoices = invoices.map(invoice => invoice.id);

        return res.json({"company": company})
        
    }
    catch (e) {
        return next(e);
    }
});

router.post("/", async (req, res, next)=> {
    try{
        let {name, description} = req.body;

        let code = slugify(name, {lower:true});

        let result = await db.query(
            `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3)
            RETURNING code, name, description`,
            [code, name, description]
        );
        return res.status(201).json({"company": result.rows[0]})
    }
    catch(e){
        return next(e);
    }
})

router.put("/:code", async (req, res, next) => {
    try{
        let {name, description} = req.body;

        let code = req.params.code;

        let result = await db.query(
            `UPDATE companies SET name =$2, description = $3 WHERE code = $1
            RETURNING code, name, description`,
            [code, name, description]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`No company with code ${code}`, 404)
          }
        else{
            return res.json({"company": result.rows[0]})
        }
    }
    catch(e){
        return next(e);
    }
})

router.delete("/:code", async (req, res, next) => {
    try{
        let code = req.params.code;

        let result = await db.query(
            `DELETE FROM companies WHERE code = $1 RETURNING code`,
            [code]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`No company with code ${code}`, 404)
          }
        else{
            return res.json({"status": "DELETED"})
        }
    }
    catch(e){
        return next(e);
    }
})

module.exports = router; 