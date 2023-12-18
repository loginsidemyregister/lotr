const express = require('express');
const app = express();
const port = 22; // Default HTTP port

app.get('/', (req, res) => {
  res.send('hi');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
