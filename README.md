Creates a list of all tables and columns for a MySQL database with anchor links for foreign key relationships

### Example Output

---

<a name="users"></a>
### users

- id `int`

- username `varchar`

- email_primary `varchar`

- member_id `int`

  - **Foreign Key To**

  - [members.id](#members)

- created_date `datetime`

- updated_date `datetime`

<a name="members"></a>
### members

- id `int`

  - **Referenced By**

  - [users.member_id](#users)
- created_date `datetime`

- updated_date `datetime`

---

### Installation

```
npm i mysql-documentation
```

### Usage

```
MYSQL_HOST=127.0.0.1 \
MYSQL_USER=root \
MYSQL_PASS=password \
MYSQL_DB=test \
OUT_PATH=.. \
OUT_NAME=test \ # will produce test.md and test.html
./node_modules/.bin/mysql-documentation
```