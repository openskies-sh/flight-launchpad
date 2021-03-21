var express = require('express');
var router = express.Router();

var async = require('async');
const {
  DateTime
} = require("luxon");
var redisclient = require('redis').createClient(process.env.REDIS_URL || {
  host: '127.0.0.1',
  port: 6379
});

let geojsonhint = require("@mapbox/geojsonhint");
const {
  check,
  validationResult
} = require('express-validator');



const axios = require('axios');
const {
  response
} = require('../app');
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    data: {},
    errors: {}
  });
});

function get_passport_token() {

}

var flight_operation_validate = [
  check('operator_name').isLength({
    min: 5,
    max: 20
  })
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

      operation_mode_lookup = {
        '1': 'vlos',
        '2': 'bvlos'
      };

      flight_declaration_json = {
        "start_time": date_split[0],
        "end_time": date_split[1],
        "flight_declaration": {
          "exchange_type": "flight_declaration",
          "originating_party": op_name,
          "flight_declaration": {
            "parts": geojson_upload
          },
          "operation_mode": operation_mode_lookup[op_mode]
        }
      }


      key = 'passport_token';
      redisclient.get(key, function (err, results) {
        if (err || results == null) {
          axios.request({
            url: "/oauth/token/",
            method: "post",
            baseURL: process.env.PASSPORT_URL,
            data: {
              "client_id": process.env.PASSPORT_CLIENT_ID,
              "client_secret": process.env.PASSPORT_CLIENT_SECRET,
              "grant_type": "client_credentials",
              "scope": process.env.PASSPORT_BLENDER_SCOPE,
              "audience": process.env.PASSPORT_AUDIENCE
            }
          }).then(passport_response => {
            console.log(passport_response)
            if (passport_response.statusCode == 200) {
              access_token = JSON.stringify(passport_response.data);
              redisclient.set(key, access_token);
              redisclient.expire(key, 3500);

              return access_token;
            } else {

              return {
                "error": "Error in Passport Query"
              }
            }
          }).catch(err => {
              console.log(err);
              return {
                "error": "Error in Passport Query"
              } });



          } else {

          }

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