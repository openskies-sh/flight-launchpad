var express = require('express');
var router = express.Router();
const { DateTime } = require("luxon");
let geojsonhint = require("@mapbox/geojsonhint");
const {
  check,
  validationResult
} = require('express-validator');


const axios = require('axios');
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
  // const form = able({ multiples: true });
  // console.log(req.body)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {

    res.render('index', {
      data: req.data, 
      errors: errors.mapped()
    });
  }
  
  
  let date_range = req.body['datetimes'];
  let date_split = date_range.split(' ');
  let op_mode = req.body['operation_type'];
  let op_name = req.body['operator_name'];
  let geojson_upload = JSON.parse(req.body['geojson_upload_control']);
  let start_date = DateTime.fromISO(date_split[0]);
  let end_date = DateTime.fromISO(date_split[2]);

  operation_mode_lookup = {'1':'vlos', '2':'bvlos'};

  flight_declaration_json = {"start_time" :date_split[0], "end_time":date_split[1], "flight_declaration":{"exchange_type":"flight_declaration","originating_party": op_name, "flight_declaration":{"parts":geojson_upload}, "operation_mode":operation_mode_lookup[op_mode]}}


  
  
  const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
  let url = base_url + '/set_flight_declaration'
  axios.post(url, flight_declaration_json, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(function (blender_response) {

    res.render('status', {
      title: "Acceptance Status",
      errors: {},
      data: blender_response
    });
  })
  .catch(function (error) {
    console.log(error)

    res.render('error-in-submission', {
      title: "Error in submission",
      errors: error,
      data: {}
    });
  });

  // req.flash("success", "Thanks for the message! I‘ll be in touch :)");
  // res.redirect("/");

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