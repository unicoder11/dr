function tlv(id: string, value: string) {
  return id + value.length.toString().padStart(2, "0") + value;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixCopiaECola(amountCents: number, txid: string) {
  const amount = (amountCents / 100).toFixed(2);
  const merchantAccount = tlv(
    "26",
    tlv("00", "BR.GOV.BCB.PIX") + tlv("01", "pagamentos@desafiosreais.com"),
  );
  const additional = tlv("62", tlv("05", txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "DR"));
  const body =
    tlv("00", "01") +
    merchantAccount +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", amount) +
    tlv("58", "BR") +
    tlv("59", "DESAFIOS REAIS") +
    tlv("60", "SAO PAULO") +
    additional +
    "6304";
  return body + crc16(body);
}
