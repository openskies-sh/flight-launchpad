var express = require('express');
var router = express.Router();
const formidable = require('formidable');

let geojsonhint = require("@mapbox/geojsonhint");
let fs = require('fs');
const {
  check,
  validationResult,
  matchedData
} = require('express-validator');


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    data: {},
    errors: {}
  });
});

var flight_operation_validate = [
  check('operator_name').isLength({ min: 5, max:20 })
  .withMessage("Operator name is required and must be more than 5 characters")
  .trim(),
  check('geojson_upload_control').custom(submitted_geo_json => {
    
    let options = {};
    let errors = geojsonhint.hint(submitted_geo_json, options);

    if (errors.length > 0) {
      console.log(errors);
      throw new Error('Invalid GeoJSON supplied.');
    } else {
      return true;
    }
  })
];

router.post('/upload', flight_operation_validate, (req, res) => {
  //req.fields contains non-file fields 
  //req.files contains files 
  // res.send(JSON.stringify(req.fields));
  // const form = formidable({ multiples: true });
  console.log(req.body)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {

    res.render('index', {
      data: req.data, 
      errors: errors.mapped()
    });
  }
  const data = matchedData(req);
  // console.log("Sanitized: ", data);

  req.flash("success", "Thanks for the message! I‘ll be in touch :)");
  res.redirect("/");

});

router.get('/submit-operation', (req, res, next) => {
  res.render('status', {
    title: "Acceptance Status",
    errors: {},
    data: {}
  });

});
router.get('/operation-status', (req, res, next) => {
  res.render('status', {
    title: "Operation Status",
    errors: {},
    data: {}
  });

});

module.exports = router;