var express = require('express');
var router = express.Router();
const formidable = require('formidable');
let geojsonhint = require("@mapbox/geojsonhint");
let fs = require('fs');
const {
  check,
  validationResult
} = require('express-validator');


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'Express'
  });
});


router.post('/upload', (req, res, next) => {
  //req.fields contains non-file fields 
  //req.files contains files 
  // res.send(JSON.stringify(req.fields));
  // const form = formidable({ multiples: true });

  // Data from form is valid.
  const form = formidable.IncomingForm();
  // form.parse(req);

  form.parse(req, (err, fields, files) => {
    res.writeHead(200, {'content-type': 'text/plain'});
    if (err) {
      next(err);
      return;
    }
    
  });
  
    form.on('file', function (name, file){
      console.log('Uploaded ' + file.name);
      let geo_json_file = files[0];
      console.log(files)
      fs.readFile(geo_json_file, function (err, data) {
        res.end(data);
      });
      
  });
  return;
  // res.rednder('preview', {
  //   title: "Preview Operation",
  //   errors: {},
  //   data: {
  //     // 'fields': fields,
  //     // 'geojson': geojson
  //   }
  // });


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