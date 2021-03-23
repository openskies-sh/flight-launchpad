var express = require('express');
var router = express.Router();
const qs = require('qs');
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
const {
  token
} = require('morgan');
/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    data: {},
    errors: {}
  });
});



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

router.post('/submit-declaration', flight_operation_validate, (req, res) => {
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
  let geo_json_with_altitude = { 'type': 'FeatureCollection', 'features': [] };
  let geo_json_features = geojson_upload['features'];
  let geo_json_features_length = geo_json_features.length;
  for (let index = 0; index < geo_json_features_length; index++) {
    const geo_json_feature = geo_json_features[index];
    var properties = { 'min_altitude': { 'meters': 30, "datum": "agl" }, 'max_altitude': { 'meters': 100, 'datum': "agl" } };
    geo_json_feature['properties'] = properties;
    geo_json_with_altitude['features'].push(geo_json_feature)
  }

  flight_declaration_json = {
    "start_time": date_split[0],
    "end_time": date_split[2],
    "flight_declaration": {
      "exchange_type": "flight_declaration",
      "originating_party": op_name,
      "flight_declaration": {
        "parts": geo_json_with_altitude
      },
      "operation_mode": operation_mode_lookup[op_mode]
    }
  };

  redis_key = 'passport_token';

  async.map([redis_key], function (r_key, done) {

    redisclient.get(r_key, function (err, results) {
      if (err || results == null) {
        let post_data = {
          "client_id": process.env.PASSPORT_CLIENT_ID,
          "client_secret": process.env.PASSPORT_CLIENT_SECRET,
          "grant_type": "client_credentials",
          "scope": process.env.PASSPORT_BLENDER_SCOPE,
          "audience": process.env.PASSPORT_AUDIENCE
        };
        axios.request({
          url: "/oauth/token/",
          method: "post",
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          baseURL: process.env.PASSPORT_URL,
          data: qs.stringify(post_data)
        }).then(passport_response => {

          if (passport_response.status == 200) {
            let a_token = passport_response.data;
            let access_token = JSON.stringify(a_token);
            redisclient.set(r_key, access_token);
            redisclient.expire(r_key, 3500);

            req.flash("success", "Thanks for the message! I‘ll be in touch :)");
            res.redirect("/");
            return done(null, a_token);
          } else {

            return done(null, {
              "error": "Error in Passport Query, response not 200"
            });
          }
        }).catch(axios_err => {

          return done(null, {
            "error": "Error in Passport Query, error in paramters supplied, check Client ID and / or secret"
          });
        });

      } else {
        let a_token = JSON.parse(results);
        return done(null, a_token);
      }

    });
  }, function (error, redis_output) {

    try {
      var passport_token = redis_output[0]['access_token'];
    } catch {
      var passport_token = {
        "error": "Error in parsing token, check redis client call"
      }
    }

    const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
    let url = base_url + '/set_flight_declaration'
    axios.post(url, flight_declaration_json, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + passport_token
      }
    })
      .then(function (blender_response) {
        if (blender_response.status == 200) {
          res.render('operation-submitted', {
            title: "Acceptance Status",
            errors: {},
            data: blender_response.data
          });
        } else {

          // console.log(error);
          res.render('error-in-submission', {
            title: "Error in submission",
            errors: blender_response.data,
            data: {}
          })
        }
      })
      .catch(function (error) {
        // console.log(error);
        res.render('error-in-submission', {
          title: "Error in submission",
          errors: error.data,
          data: {}
        });
      });

    // req.flash("error", "There was a error in submisssion :/");
    // res.redirect("/");




  });
  // return;


});


router.get('/operation-status/:uuid', (req, res, next) => {
  let operationUUID = req.params.uuid;
  const is_uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationUUID);
  uuid_OK = (is_uuid) ? operationUUID : false;
  if (!uuid_OK) {
    res.status(400).send("No operation specified.");
    return;
  }
  redis_key = 'passport_token';

  async.map([redis_key], function (r_key, done) {

    redisclient.get(r_key, function (err, results) {
      if (err || results == null) {
        axios.request({
          url: "/oauth/token/",
          method: "post",
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          baseURL: process.env.PASSPORT_URL,
          data: {
            "client_id": process.env.PASSPORT_CLIENT_ID,
            "client_secret": process.env.PASSPORT_CLIENT_SECRET,
            "grant_type": "client_credentials",
            "scope": process.env.PASSPORT_BLENDER_SCOPE,
            "audience": process.env.PASSPORT_AUDIENCE
          }
        }).then(passport_response => {

          if (passport_response.status == 200) {
            let a_token = passport_response.data;
            let access_token = JSON.stringify(a_token);
            redisclient.set(r_key, access_token);
            redisclient.expire(r_key, 3500);

            req.flash("success", "Thanks for the message! I‘ll be in touch :)");
            res.redirect("/");
            return done(null, a_token);
          } else {

            return done(null, {
              "error": "Error in Passport Query, response not 200"
            });
          }
        }).catch(axios_err => {

          return done(null, {
            "error": "Error in Passport Query, error in paramters supplied, check Client ID and / or secret"
          });
        });

      } else {
        let a_token = JSON.parse(results);
        return done(null, a_token);
      }

    });
  }, function (error, redis_output) {

    try {
      var passport_token = redis_output[0]['access_token'];
    } catch {
      var passport_token = {
        "error": "Error in parsing token, check redis client call"
      }
    }

    const base_url = process.env.BLENDER_BASE_URL || 'http://local.test:8000';
    let url = base_url + '/flight_declaration/' + operationUUID;

    axios.get(url, {
      headers: {

        'Content-Type': 'application/json',
        'Authorization': "Bearer " + passport_token

      }
    }).then(function (blender_response) {

      if (blender_response.status == 200) {
        res.render('status', {
          title: "Operation Status",
          errors: {},
          data: blender_response.data
        });
      } else {

        console.log(blender_response.data);
        res.render('error-in-submission', {
          title: "Error in submission",
          errors: blender_response.data,
          data: {}
        })
      }
    });

  });

});

module.exports = router;