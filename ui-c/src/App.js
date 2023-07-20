import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useRouteMatch,
  useParams,
} from 'react-router-dom';
import axios from 'axios';

const formatTimestamp = (timestamp) => {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleString();
};

function PayoutPage() {
  const [file, setFile] = useState(null);
  const [processing, setprocessing] = useState(false);
  const [payments, setPayments] = useState([]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setFile(event.target.files[0]);
    const formData = new FormData();
    formData.append('myFile', file);

    try {
      const response = await axios.post(
        'http://localhost:3000/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      // Handle the response and update the page state or perform any necessary operations

      console.log(response.data);

      setPayments(response.data.metadata.payments);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (file) {
      const formData = new FormData();
      formData.append('myFile', file);

      try {
        setprocessing(true);
        console.log('Processing payments...');

        const response = await axios.post(
          'http://localhost:3000/start-payments',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        console.log('Finished processing');
        console.log(response.data);
        setprocessing(false);

        // Handle the response and update the page state or perform any necessary operations

        // Clear the form after successful submission
        setFile(null);
        event.target.reset();
      } catch (error) {
        setprocessing(false);
        console.error('Error starting payments:', error);
      }
    }
  };

  return (
    <div>
      <h1>Payout Page</h1>

      {processing ? <p>Wait...</p> : <p></p>}

      <form
        onSubmit={handleSubmit}
        onReset={() => {
          setFile(null);
          setPayments([]);
        }}
      >
        <input type='file' onChange={handleFileUpload} disabled={processing} />
        <button type='submit' disabled={processing}>
          Start Payments
        </button>
        <button type='reset' disabled={processing}>
          Reset
        </button>
      </form>

      {payments.length > 0 && (
        <div>
          <h2>Payments to be initiated</h2>
          <table border='1'>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={index}>
                  <td>{payment.from.name}</td>
                  <td>{`${payment.to.firstName} ${payment.to.lastName}`}</td>
                  <td>{payment.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportingPage() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/reports');
        console.log(response.data);
        setReports(response.data.data);
      } catch (error) {
        console.error('Error fetching reports:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Reporting Page</h1>
      {reports.length > 0 ? (
        <ul>
          {reports.map((report) => (
            <li key={report._id}>
              <Link to={`/reports/${report._id}`}>
                {formatTimestamp(report._id)}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No reports available</p>
      )}
    </div>
  );
}

function ReportDetails() {
  const { id } = useParams();
  const [report, setReport] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/reports/${id}`);
        console.log(response.data);
        setReport(response.data);
      } catch (error) {
        console.error('Error fetching report:', error);
      }
    };

    fetchReport();
  }, [id]);

  if (!report) {
    return <p>Loading report...</p>;
  }

  return (
    <div>
      <h2>Report Details</h2>
      <h3>Amount Per Source Account</h3>
      {report.amountPerSourceAcct.length > 0 ? (
        <table border='1'>
          <thead>
            <tr>
              <th>Source Account</th>
              <th>Total amount paid</th>
            </tr>
          </thead>
          <tbody>
            {report.amountPerSourceAcct.map((item) => (
              <tr key={item._id}>
                <td>{item._id}</td>
                <td>{item.numberOfPayments / 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No data available</p>
      )}

      <h3>Amount Per Branch</h3>
      {report.amountPerBranch.length > 0 ? (
        <table border='1'>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Total amount paid</th>
            </tr>
          </thead>
          <tbody>
            {report.amountPerBranch.map((item) => (
              <tr key={item._id}>
                <td>{item._id}</td>
                <td>{item.numberOfPayments / 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No data available</p>
      )}

      <h3>All Payments</h3>
      {report.allPayments.length > 0 ? (
        <table border='1'>
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Source Account</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {report.allPayments.map((payment) => (
              <tr key={payment._id}>
                <td>{payment._id}</td>
                <td>{payment.sourceAcct}</td>
                <td>{payment.branch}</td>
                <td>{payment.data.status}</td>
                <td>{payment.amount / 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to='/payout'>Payout</Link>
            </li>
            <li>
              <Link to='/reporting'>Reporting</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route exact path='/payout' element={<PayoutPage />} />
          <Route exact path='/reporting' element={<ReportingPage />} />
          <Route path='/reports/:id' element={<ReportDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
