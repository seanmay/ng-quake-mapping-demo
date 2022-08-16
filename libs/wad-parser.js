/** @param {DataView} view */
const parse_wad_header = (view) => {
  const count = view.getUint32(4, true);
  const offset = view.getUint32(8, true);

  return { count, offset };
};

const read_string = (view, size, offset) => {
  let str = "";
  let next = 0;
  while (next < size) {
    const byte = view.getUint8(offset + next);
    if (byte === 0) break;
    const char = String.fromCharCode(byte);
    str += char;
    next += 1;
  }
  return str;
};

const parse_glossary_entry = (view, t) => {
  const offset = view.getUint32(t, true);
  const dsize = view.getUint32(t + 4, true);
  const size = view.getUint32(t + 8, true);
  const type = view.getUint8(t + 12) % 16;
  const compression = view.getUint8(t + 13);
  const blank = view.getUint16(t + 14);
  const name = read_string(view, 16, t + 16);

  return { offset, dsize, size, type, compression, name };
};

const parse_wad_entry = (view, header) => {
  const { offset, type, } = header;
  switch (type) {
    case 0: { // PALETTE
      let bytes = new Uint8Array(256 * 3);
      for (let i = 0; i < 256 * 3; i +=1) {
        bytes[i] = view.getUint8(offset + i);
      }
      return { width: 16, height: 16, bytes, type };
    }
    case 2: // PICTURE
    break;

    case 4: { // TEXTURE
      const image_data_offset = offset + 40;
      const name = read_string(view, 16, offset);
      const width = view.getUint32(offset + 16, true);
      const height = view.getUint32(offset + 20, true);
      const bytes = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i += 1) {
        const byte = view.getUint8(image_data_offset + i);
        bytes[i] = byte;
      }
      return { name, width, height, bytes, type };
    }
    case 5: // CONSOLE PICTURE
    break;
  }
};

const parse_wad_entries = (view, glossary) =>
  glossary.map(d => parse_wad_entry(view, d));

const parse_wad_glossary = (view, count, offset) => {
  let entries = [];
  for (let i = 0; i < count; i += 1) {
    const entry = parse_glossary_entry(view, offset + i * 32);
    entries.push(entry);
  }
  return entries;
};

const parse = (buffer) => {
  const view = new DataView(buffer);

  const header = parse_wad_header(view);
  const glossary = parse_wad_glossary(view, header.count, header.offset);
  const entries = parse_wad_entries(view, glossary).map((entry, i) => ({ ...entry, name: glossary[i].name }));

  return { header, glossary, entries };
};

const wad_parser = {
  parse
};


export default wad_parser;