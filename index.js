const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()
const port = 3000

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let licenses = [];

// allowed status
const statusList = ["active", "expired", "suspended", "revoked", "blocked"];

// helper: check expiry
function checkStatus(expiryDate, currentStatus) {
  if (["revoked", "suspended", "blocked"].includes(currentStatus)) {
    return currentStatus;
  }
  return new Date(expiryDate) < new Date() ? "expired" : "active";
}

// generate license number
function generateLicenseNumber(id) {
  return "LIC-" + (1000 + id);
}

// GET all licenses
app.get('/api/licenses', (req, res) => {
  const result = licenses.map(l => ({
    ...l,
    status: checkStatus(l.expiryDate, l.status)
  }));
  res.json(result);
});

// GET one license
app.get('/api/licenses/:id', (req, res) => {
  const license = licenses.find(l => l.id == req.params.id);

  if (!license) {
    return res.status(404).json({ message: "License not found" });
  }

  license.status = checkStatus(license.expiryDate, license.status);
  res.json(license);
});

// CREATE license
app.post('/api/licenses', (req, res) => {
  const { holderName, type, issueDate, expiryDate } = req.body;

  if (!holderName || !type || !issueDate || !expiryDate) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  const id = licenses.length + 1;

  const newLicense = {
    id,
    licenseNumber: generateLicenseNumber(id),
    holderName,
    type,
    issueDate,
    expiryDate,
    status: "active",
    violation: null
  };

  licenses.push(newLicense);

  res.status(201).json({
    message: "License created",
    license: newLicense
  });
});

// UPDATE license info
app.put('/api/licenses/:id', (req, res) => {
  const license = licenses.find(l => l.id == req.params.id);

  if (!license) {
    return res.status(404).json({ message: "License not found" });
  }

  if (license.status === "revoked") {
    return res.status(403).json({
      message: "Cannot update revoked license"
    });
  }

  const { holderName, type, issueDate, expiryDate } = req.body;

  if (holderName) license.holderName = holderName;
  if (type) license.type = type;
  if (issueDate) license.issueDate = issueDate;
  if (expiryDate) license.expiryDate = expiryDate;

  license.status = checkStatus(license.expiryDate, license.status);

  res.json({
    message: "License updated",
    license
  });
});

// UPDATE status
app.put('/api/licenses/:id/status', (req, res) => {
  const license = licenses.find(l => l.id == req.params.id);

  if (!license) {
    return res.status(404).json({ message: "License not found" });
  }

  if (license.status === "revoked") {
    return res.status(403).json({
      message: "Cannot modify revoked license"
    });
  }

  const { status, violation } = req.body;

  if (!statusList.includes(status)) {
    return res.status(400).json({
      message: "Invalid status"
    });
  }

  license.status = status;
  license.violation = violation || null;

  res.json({
    message: "Status updated",
    license
  });
});

// DELETE license
app.delete('/api/licenses/:id', (req, res) => {
  const license = licenses.find(l => l.id == req.params.id);

  if (!license) {
    return res.status(404).json({ message: "License not found" });
  }

  licenses = licenses.filter(l => l.id != req.params.id);

  res.json({
    message: "License deleted"
  });
});


app.get('/', (req, res) => {
  res.send('WELCOME TO LICENSE SYSTEM');
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});