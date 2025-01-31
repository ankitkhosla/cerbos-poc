### POC with Cerbos

#### Setup:

```sh

# Setp 1
git clone git@github.com:ankitkhosla/cerbos-poc.git

# Step 2
cd cerbos-poc && npm i

# Step 3 - open your terminal and run the below command in a new tab which will clear any existing policies and start a Cerbos instance
npm run start:cerbos

# Step 4 - open a new terminal tab and run the below command to run policies defined under index.ts
npm run start
```

#### Cerbos admin server runs on port `3592`: http://localhost:3592

#### Provide the admin credentials here: http://localhost:3592/#auth

```
username: cerbos
password: cerbos
```

Once the above credentials have been provided, you can invoke the API via the dashboard.
