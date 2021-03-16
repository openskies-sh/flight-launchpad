var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


router.post('/upload', (req, res) => {
  //req.fields contains non-file fields 
  //req.files contains files 
  res.send(JSON.stringify(req.fields));
});

module.exports = router;

