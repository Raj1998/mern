const express = require('express');
const fileUpload = require('express-fileupload');
const xml2js = require('xml2js');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const methodObj = require('method-node');

const method = new methodObj.Method({
    
  apiKey: 'API_KEY',
  env: methodObj.Environments.dev,
});

const app = express();
app.use(fileUpload());
app.use(bodyParser.json());
// Enable CORS
app.use(cors());

const PHONE_NUMBER = '+15121231111';

// Connect to MongoDB
mongoose
  .connect('mongodb://localhost:27017/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Define a Mongoose schema for the collection
const paymentSchema = new mongoose.Schema({
  _id: String,
  data: Object,
  sourceAcct: String,
  branch: String,
  reportTimestamp: String,
  amount: Number,
});

// Define a Mongoose model based on the schema
const PaymentsModel = mongoose.model('payments', paymentSchema);

const counter = new Map();

function parseXmlFile(file) {
  let payments = [];
  xml2js.parseString(file.data, (err, result) => {
    if (err) {
      console.error('Error parsing XML:', err);
      return res.status(500).json({ message: 'Failed to parse XML file.' });
    }

    paymentsCount = result.root.row.length;

    result.root.row.forEach((payment) => {
      payments.push({
        from: {
          payorId: payment.Payor[0].DunkinId[0],
          acct: payment.Payor[0].AccountNumber[0],
          routing: payment.Payor[0].ABARouting[0],
          name: payment.Payor[0].Name[0],
          dba: payment.Payor[0].DBA[0],
          ein: payment.Payor[0].EIN[0],
        },
        to: {
          employeeId: payment.Employee[0].DunkinId[0],
          branch: payment.Employee[0].DunkinBranch[0],

          firstName: payment.Employee[0].FirstName[0],
          lastName: payment.Employee[0].LastName[0],
          dob: payment.Employee[0].DOB[0],

          plaidId: payment.Payee[0].PlaidId[0],
          acct: payment.Payee[0].LoanAccountNumber[0],
        },
        amount: payment.Amount[0],
      });
    });
  });
  return payments;
}

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: 'No files were uploaded.' });
  }

  const file = req.files.myFile;

  // Check if the uploaded file is an XML file
  if (file.mimetype !== 'text/xml' && file.mimetype !== 'application/xml') {
    return res
      .status(400)
      .json({ message: 'Invalid file format. Please upload an XML file.' });
  }

  var payments = parseXmlFile(file);

  // Process the XML object as needed
  // Here, we simply respond with the parsed XML data
  res.json({
    message: `XML file processed successfully.  ${payments.length} payments will be processed`,
    //   data: result,
    metadata: {
      payments: payments,
    },
  });
});

app.post('/start-payments', async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: 'No files were uploaded.' });
  }

  const file = req.files.myFile;

  // Check if the uploaded file is an XML file
  if (file.mimetype !== 'text/xml' && file.mimetype !== 'application/xml') {
    return res
      .status(400)
      .json({ message: 'Invalid file format. Please upload an XML file.' });
  }

  const payments = parseXmlFile(file);
  var reportDateTime = Date.now();

  for (let i = 0; i < payments.length; i++) {
    // payments.forEach( async (payment) => {

    let payment = payments[i];

    let indEnt = payment.to;
    // let

    // TODO: skip this create call if employeeId is seen
    const entity = await method.entities.create(
      {
        type: 'individual',
        individual: {
          first_name: indEnt.firstName,
          last_name: indEnt.lastName,
          phone: PHONE_NUMBER,
          email: 'email@gmail.com',
          dob: '1973-08-21',
        },
      },
      {
        idempotency_key: indEnt.employeeId,
      }
    );

    // TODO: Have a local hashMap for plaidId -> merchantId mapping to avoid this api call
    const merchants = await method.merchants.list({
      'provider_id.plaid': indEnt.plaidId,
    });

    // TODO: skip this call if idempotency_key is already seen for the batch => mapping
    const liabilityAccount = await method.accounts.create(
      {
        holder_id: entity.id,
        liability: {
          mch_id: merchants[0].mch_id,
          account_number: indEnt.acct,
        },
      },
      {
        idempotency_key: `${entity.id}-${merchants[0].mch_id}-${indEnt.acct}`,
      }
    );

    let corpEntReq = payment.from;
    const corpEntity = await method.entities.create(
      {
        type: 'c_corporation',
        corporation: {
          name: corpEntReq.name,
          dba: corpEntReq.dba,
          ein: corpEntReq.ein,
          owners: [
            {
              first_name: 'Sergey',
              last_name: 'Brin',
              phone: '+16505555555',
              email: 'sergey@google.com',
              dob: '1973-08-21',
              address: {
                line1: '600 Amphitheatre Parkway',
                line2: null,
                city: 'Mountain View',
                state: 'CA',
                zip: '94043',
              },
            },
          ],
        },
        address: {
          line1: '1600 Amphitheatre Parkway',
          line2: null,
          city: 'Mountain View',
          state: 'CA',
          zip: '94043',
        },
      },
      {
        idempotency_key: corpEntReq.payorId,
      }
    );

    let x = 1;

    const corpAccount = await method.accounts.create(
      {
        holder_id: corpEntity.id,
        ach: {
          routing: corpEntReq.routing,
          number: corpEntReq.acct,
          type: 'checking',
        },
      },
      {
        idempotency_key: corpEntReq.payorId,
      }
    );

    let amount = parseInt(parseFloat(payment.amount.substring(1)) * 100);
    const initiatedPayment = await method.payments.create({
      amount: amount,
      source: corpAccount.id,
      destination: liabilityAccount.id,
      description: 'Loan Pmt',
    });

    await PaymentsModel.create({
      _id: initiatedPayment.id,
      sourceAcct: corpAccount.id,
      branch: indEnt.branch,
      reportTimestamp: reportDateTime,
      data: initiatedPayment,
      amount: amount,
    });

    // })
  }

  res.json({
    message: 'payments submitted',
  });
});

app.get('/reports/:reportTimestamp?', async (req, res) => {
  const reportTimestamp = req.params.reportTimestamp;

  if (!reportTimestamp) {
    let data = await PaymentsModel.aggregate([
      {
        $group: {
          _id: '$reportTimestamp',
          numberOfPayments: { $sum: 1 },
        },
      },
      {
        $sort: { internalDate: 1 },
      },
    ]);

    data = data.sort((a, b) => parseInt(b._id) - parseInt(a._id));

    res.json({
      message: 'Reports retrieved',
      data: data,
    });
  } else {
    const amountPerSourceAcct = await PaymentsModel.aggregate([
      {
        $match: {
          reportTimestamp: reportTimestamp,
        },
      },
      {
        $group: {
          _id: '$sourceAcct',
          numberOfPayments: { $sum: '$amount' },
        },
      },
    ]);

    const amountPerBranch = await PaymentsModel.aggregate([
      {
        $match: {
          reportTimestamp: reportTimestamp,
        },
      },
      {
        $group: {
          _id: '$branch',
          numberOfPayments: { $sum: '$amount' },
        },
      },
    ]);

    const allPayments = await PaymentsModel.aggregate([
      {
        $match: {
          reportTimestamp: reportTimestamp,
        },
      },
    ]);

    res.json({
      message: `Report retrieved for ${reportTimestamp} `,
      reportTimestamp: reportTimestamp,
      amountPerSourceAcct: amountPerSourceAcct,
      amountPerBranch: amountPerBranch,
      allPayments: allPayments,
    });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
