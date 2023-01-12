import express from 'express'
import axios from 'axios'
import cors from 'cors'
import mysql from 'mysql2'
const app = express()
const port = 8000;

//MYSQL backend server
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "passwordForDatabase",
  database: "nameOfDatabase"
})

//utils
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json("get request received at home route")
})

app.get('/cart', (req, res) => {
  res.json("get request received at cart route")
})

app.get("/admin", (req, res) => {
  const q = "SELECT * FROM ordertable"

  db.query(q, (err, data) => {
    if (err) return res.status(500).json(err)
    return res.status(200).json(data)
  })
})

app.post('/cart', (req, res) => {
  const cartAmount = req.body.dataOne[0].cartAmount;
  const orderDetails = req.body.dataOne.map(product => product);
  const stringifiedOrderDetails = JSON.stringify(orderDetails);
  const token = req.body.dataTwo;
  const data = `{"parent_uid":"5c9c167d3df941f7", "value": ${cartAmount}, "extra_data": "${token}"}`;

  axios.post("https://www.blockonomics.co/api/create_temp_product", data, {
    headers: {
      'Authorization': 'Bearer NMaqmjDnK05eRszvSghB8jQdfEhyHyRogh1yg27FFcs',
      'Content-Type': 'text/plain'
    },
    params: {
      amount: cartAmount,
    },
  }).then(function (response) {
    const UID = response.data.uid
    const q = "INSERT INTO ordertable (`cartDetails`, `token`) VALUES (?)"
    const values = [
      stringifiedOrderDetails,
      token
    ]

    db.query(q, [values], (err) => {
      if (err) return res.json(err)
      return res.status(200).send(UID)
    })
  }).catch(err => console.log(err));
})

app.get("/orderhook", (req, res) => {
  const orderStatus = req.query.status
  const orderUUID = req.query.uuid
  const url = `https://www.blockonomics.co/api/merchant_order/${orderUUID}`
  const config = {
    headers: {
      'Authorization': 'Bearer NMaqmjDnK05eRszvSghB8jQdfEhyHyRogh1yg27FFcs'
    }
  }

  axios.get(url, config)
    .then(function (response) {
      const orderToken = response.data.data.extradata
      const q = "UPDATE ordertable SET `orderStatus`=?, `orderUUID`=? WHERE `token`=?"

      db.query(q, [orderStatus, orderUUID, orderToken], (err) => {
        if (err) return res.status(400).json(err)
        return res.json("Order successfully updated")
      })
    })
    .catch(function (error) {
      console.log(error);
    });
})

app.listen(port, () => {
  console.log(`App is listening on port ${port}`)
})
