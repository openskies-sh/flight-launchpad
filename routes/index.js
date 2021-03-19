var express = require('express');
var router = express.Router();
const formidable = require('formidable');

const gjv = require("geojson-validation");
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

  var form = new formidable.IncomingForm();



  form.parse(req, (err, fields, files) => {
    if (err) {
      next(err);
      return;
    }
    console.log(fields);
    console.log(files);
    
  
  res.render('preview', {
    title: "Preview Operation",
    errors: {},
    data: {
      'fields': fields,
      // 'geojson': geojson
    }
  });

  });

  return;

  
  // res.render('preview', {
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