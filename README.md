

Steps to run locally

`cd api; npm install; npm run dev`

`cd ../ui; npm install; npm start`

mongodb local setup is required

change the api-key in `api/index.js`


## Approach
- Current implementation is MVP stage. Also in the UI is bare minimum right now (with no styling)

## Enhancements
- To avoid creation of users/entities and account I've used the Idempotency key which is supported out of box

- As the API is rate limited, we can store this infomation in the database to avoid making duplicate calls.

- Also When the 601st request will hit and we see the 429 code, we have to add the setTimeout() to wait for some time.

- On the UI side we may have pagination to avoid long scrolling, also individual reporting page should 

- I was told not to upload the whole file, since it would've taken 2 hours+ to finish processing. I used trimmed version of the file.

## Payment processing api design improvements 
- [POST] /start-payments
- This endpoint will take a long time to process all the payments. A better design for this would be to have a message queue in between and a separate consumer which picks up the payments and does the processing.
- Also on the database we may have a table which stores the status of the batch, when all the payments are processed the consumer process will update the status and on the UI we may show the report afterwards.
