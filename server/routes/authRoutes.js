const router = require("express").Router();

router.post("/register", (req, res) => {

  res.status(501).json({
    error: "Account registration is not enabled. EcoRoute currently saves trips on your device."
  });

});

module.exports = router;
