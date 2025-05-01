const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode")

exports.getHuyen = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CALL get_distinct_huyen_proc('huyen_cursor')");
    const result = await client.query("FETCH ALL FROM huyen_cursor");
    await client.query("COMMIT");

    const data = result.rows.map((row) => ({
      value: row.huyen,
      label: convertTcvn3ToUnicode(row.huyen),
    }));

    res.json(data);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getXaByHuyen = async (req, res) => {
  const { huyen } = req.query;
  console.log("🎯 Huyện FE truyền lên:", huyen); // ← đặt ở đây
  if (!huyen) return res.status(400).json({ error: "Thiếu tham số huyện" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CALL get_xa_by_huyen_proc($1, 'xa_cursor')", [huyen]);
    const result = await client.query("FETCH ALL FROM xa_cursor");
    await client.query("COMMIT");

    const data = result.rows.map((row) => ({
      value: row.xa,
      label: convertTcvn3ToUnicode(row.xa),
    }));
    console.log(data)
    res.json(data);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getTieuKhuByXa = async (req, res) => {
  const { xa } = req.query;
  if (!xa) return res.status(400).json({ error: "Thiếu tham số xã" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CALL get_tk_by_xa_proc($1, 'tk_cursor')", [xa]);
    const result = await client.query("FETCH ALL FROM tk_cursor");
    await client.query("COMMIT");

    const data = result.rows.map((row) => ({
      tk: row.tk,
    }));

    res.json(data);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getAllKhoanh = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CALL get_all_khoanh_proc('khoanh_cursor')");
    const result = await client.query("FETCH ALL FROM khoanh_cursor");
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

exports.getAllChuRung = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CALL get_all_churung_proc('churung_cursor')");
    const result = await client.query("FETCH ALL FROM churung_cursor");
    await client.query("COMMIT");

    const data = result.rows.map((row) => ({
      churung: convertTcvn3ToUnicode(row.churung),
    }));

    res.json(data);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};
