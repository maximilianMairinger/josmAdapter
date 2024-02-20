const app = require('express')();

app.get('/', (req, res) => {
  res.send('');
});

if (isNaN(+process.env.PORT)) throw new Error("PORT is not a number")

app.listen(+process.env.PORT, () => {
  console.log(`Server running on http://127.0.0.1:${process.env.PORT}`);
})