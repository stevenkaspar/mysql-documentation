const fs = require('fs')
const marked = require('marked')

const mysql = require('./services/mysql-connection')
let mysql_connection = null

const getTableFields = async () => {
  const query_string = `SELECT *
    FROM information_schema.columns
    WHERE table_schema = '${process.env.MYSQL_DB}';
  `
  const result = await mysql_connection.query(query_string)
  return result.map((row) => ({
    table_name: row.TABLE_NAME,
    column_name: row.COLUMN_NAME,
    data_type: row.DATA_TYPE,
  }))
}
const getForeignKeys = async () => {
  const query_string = `SELECT *
    FROM information_schema.key_column_usage 
    WHERE referenced_table_name IS NOT NULL
      AND table_schema = '${process.env.MYSQL_DB}';`
  const result = await mysql_connection.query(query_string)
  return result.map((row) => ({
    table_name: row.TABLE_NAME,
    column_name: row.COLUMN_NAME,
    referenced_table_name: row.REFERENCED_TABLE_NAME,
    referenced_column_name: row.REFERENCED_COLUMN_NAME,
  }))
}

const parseTableFields = async () => {
  const table_field_array = await getTableFields()
  const table_dict = {}
  for (const table_field_type of table_field_array) {
    const table = table_field_type.table_name
    const field = table_field_type.column_name
    const type = table_field_type.data_type
    if (typeof table_dict[table] === 'undefined') {
      table_dict[table] = {}
    }
    table_dict[table][field] = type
  }
  return table_dict
}

const parseForeignKeys = async () => {
  const table_field_array = await getForeignKeys()
  const table_dict = {
    source_ref: {},
    ref_source: {},
  }
  // console.log(table_field_array)
  for (const table_field of table_field_array) {
    const ref = [
      table_field.table_name,
      table_field.column_name,
    ]
    const source = [
      table_field.referenced_table_name,
      table_field.referenced_column_name,
    ]
    if (typeof table_dict.source_ref[source[0]] === 'undefined') {
      table_dict.source_ref[source[0]] = {}
    }
    if (typeof table_dict.source_ref[source[0]][source[1]] === 'undefined') {
      table_dict.source_ref[source[0]][source[1]] = {}
    }
    if (typeof table_dict.source_ref[source[0]][source[1]][ref[0]] === 'undefined') {
      table_dict.source_ref[source[0]][source[1]][ref[0]] = {}
    }
    table_dict.source_ref[source[0]][source[1]][ref[0]][ref[1]] = 1
    
    if (typeof table_dict.ref_source[ref[0]] === 'undefined') {
      table_dict.ref_source[ref[0]] = {}
    }
    if (typeof table_dict.ref_source[ref[0]][ref[1]] === 'undefined') {
      table_dict.ref_source[ref[0]][ref[1]] = {}
    }
    if (typeof table_dict.ref_source[ref[0]][ref[1]][source[0]] === 'undefined') {
      table_dict.ref_source[ref[0]][ref[1]][source[0]] = {}
    }
    table_dict.ref_source[ref[0]][ref[1]][source[0]][source[1]] = 1
  }
  return table_dict
}

const getMarkdownString = async () => {
  const table_dict = await parseTableFields()
  const {
    source_ref,
    ref_source,
  } = await parseForeignKeys()

  let markdown_string = ''
  for (const table of Object.keys(table_dict)) {
    markdown_string += `\n<a name="${table}"></a>\n### ${table}\n\n`
    for (const field of Object.keys(table_dict[table])) {
      markdown_string += `- ${field} \`${table_dict[table][field]}\`\n\n`
      if (
        source_ref[table] &&
        source_ref[table][field]
      ) {
        markdown_string += `  - **Referenced By**\n\n`
        for (const foreign_key_table of Object.keys(source_ref[table][field])) {
          for (const foreign_key_field of Object.keys(source_ref[table][field][foreign_key_table])) {
            markdown_string += `  - [${foreign_key_table}.${foreign_key_field}](#${foreign_key_table})\n`
          }
        }
      }
      if (
        ref_source[table] &&
        ref_source[table][field]
      ) {
        markdown_string += `  - **Foreign Key To**\n\n`
        for (const foreign_key_table of Object.keys(ref_source[table][field])) {
          for (const foreign_key_field of Object.keys(ref_source[table][field][foreign_key_table])) {
            markdown_string += `  - [${foreign_key_table}.${foreign_key_field}](#${foreign_key_table})\n`
          }
        }
      }
    }
  }
  return markdown_string
}

const writeOut = async (markdown_string) => Promise.all([
  whiteOutMD(markdown_string),
  whiteOutHTML(markdown_string),
])
const getOutputFilePath = () => {
  const path = process.env.OUT_PATH || process.cwd()
  if (path) {
    if (/\//ig.test(path.slice(-1))) {
      return path
    }
  }
  return `${path}/`
}
const getOutputFileName = () => process.env.OUT_NAME || process.env.MYSQL_DB
const whiteOutMD = async (markdown_string) => fs.writeFileSync(`${getOutputFilePath()}${getOutputFileName()}.md`, markdown_string, 'utf8')
const whiteOutHTML = async (markdown_string) => fs.writeFileSync(`${getOutputFilePath()}${getOutputFileName()}.html`, marked(markdown_string), 'utf8')

const runDocumentation = async () => mysql()
  .then((connection) => mysql_connection = connection)
  .then(getMarkdownString)
  .then(writeOut)

module.exports = runDocumentation