# NQM Databot WAHSN Tool Docs
## Databot commands
* ```createAccounts``` - creates the user accounts from account list table data. Generates the secret for each account and adds it to the account list table.

## Table definitions

### Account list table
The accounts table stores the ```accountId```, ```accountName``` and ```accountSecret```. To create a list of users one needs to add only the info for ```accountId``` and ```accountName```. The databot will generate the ```accountSecret``` automatically.

| ```accountId``` | ```accountName``` | ```accountSecret``` |
| --- | --- | --- |
| sdhjs53HX | John Smith | pass_for_john |
| sewrtejs53HX | Andrew Smith | pass_for_andrew |
| ptyoiejsAF | Mark Smith | pass_for_mark |
