// Linden: where the library's files are (Google Drive): every request the app makes for one, and the addresses its copies are kept under on this device.
// (One of the app's scripts, which share one scope, loaded in order by
// index.html: files, library, apa, csl, marks, reader, save, contents, bookmarks, pdflib, editing, cite, notes, citecheck, newpapers, ocr, split, outline, findpdf, titlesearch, keywords, chapters, related, marksindex, inbox, trash, citecard, tour, start.)
'use strict';
(self.LIBLANDE_PARTS = self.LIBLANDE_PARTS || {})['app/files.js'] = '2026-11-25.06';
/* ---- the files, in Google Drive */
// Everything the app itself asks of the storage the PDFs are in, here in
// one place (docs/storage-plan.md, stage 1), so that another storage
// (Dropbox, OneDrive) is another FILES, not changes all through the app.
// The server's side (the .bib, the library, the Linden folder) has its own:
// the storage in pages/builder.js. Requests answer as fetch does (a
// Response), each caller checking it as before. Google Docs, for Cite
// Check, stay Google's (citecheck.js).
const DRIVE_API = 'https:\/\/www.googleapis.com/drive/v3/', DRIVE_UPLOAD = 'https:\/\/www.googleapis.com/upload/drive/v3/';
const FILES = {
  // Kept on this device. A paper's copy is kept under the address it came
  // from (sw.js keeps it on its way: the two must agree), its checksum
  // beside it, and Linden's own notes (the choice of how many, the
  // papers kept for lists) under made-up names in the same place.
  key: id => DRIVE_API + 'files/' + encodeURIComponent(id) + '?alt=media',
  sumKey: id => DRIVE_API + 'files/' + encodeURIComponent(id) + '?fields=md5Checksum',
  noteKey: name => DRIVE_API + 'files/__' + name + '__',
  // (A key's file id; '' for one that isn't a paper's.)
  idOfKey(url) { const m = /\/files\/([^/?]+)\?alt=media/.exec(url); return m ? decodeURIComponent(m[1]) : ''; },
  // A PDF: with this device's token, renewed if it's run out (googleFetch);
  // or with a token given, as it is.
  get: (id, opts, ms) => googleFetch(FILES.key(id), opts || {}, ms),
  getWith: (id, token, opts) => fetch(FILES.key(id), Object.assign({}, opts, { headers: Object.assign({}, opts && opts.headers, { Authorization: 'Bearer ' + token }) })),
  // Its details (Drive's fields: size, md5Checksum).
  meta: (id, fields, ms) => googleFetch(DRIVE_API + 'files/' + encodeURIComponent(id) + '?fields=' + fields, {}, ms),
  metaWith: (id, fields, token) => fetch(DRIVE_API + 'files/' + encodeURIComponent(id) + '?fields=' + fields, { headers: { Authorization: 'Bearer ' + token } }),
  // A PDF written over with new bytes (its marks); answers with its new md5Checksum.
  replace: (id, bytes, ms) => googleFetch(DRIVE_UPLOAD + 'files/' + encodeURIComponent(id) + '?uploadType=media&fields=md5Checksum',
    { method: 'PATCH', headers: { 'Content-Type': 'application/pdf' }, body: bytes }, ms),
  // A new PDF in a folder; answers with its id.
  create(folderId, name, file, token, signal) {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name, parents: [folderId], mimeType: 'application/pdf' })], { type: 'application/json' }));
    form.append('file', file);
    return fetch(DRIVE_UPLOAD + 'files?uploadType=multipart&fields=id',
      Object.assign({ method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form }, signal ? { signal } : {}));
  },
  // The newest file of this name in a folder, made since `since` (one
  // that arrived though its answer didn't); answers with files(id,createdTime).
  madeSince(folderId, name, since, token, ms) {
    const q = `'${folderId}' in parents and name = '${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}' and trashed = false and createdTime > '${since}'`;
    return fetchWithin(DRIVE_API + 'files?q=' + encodeURIComponent(q) + '&fields=files(id,createdTime)&orderBy=createdTime desc', { headers: { Authorization: 'Bearer ' + token } }, ms);
  },
  // A copy, in a folder, named so.
  copy: (id, name, folderId, token) => fetch(DRIVE_API + 'files/' + encodeURIComponent(id) + '/copy?fields=id', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parents: [folderId] }),
  }),
  // What's changed since a token (Drive's changes): the first token, then
  // pages of changes(fileId), each with nextPageToken or newStartPageToken.
  changesStart: () => googleFetch(DRIVE_API + 'changes/startPageToken'),
  changes: tok => googleFetch(DRIVE_API + 'changes?pageSize=1000&fields=nextPageToken,newStartPageToken,changes(fileId)&pageToken=' + encodeURIComponent(tok)),
  // An address of the storage's own, asked to see if it can be reached
  // (any answer will do; it isn't signed).
  reachUrl: DRIVE_API + 'about?fields=kind',
  // A file opened in Drive's own page (or, with no id, looked for there).
  link: f => f.id
    ? 'https:\/\/drive.google.com/file/d/' + encodeURIComponent(f.id) + '/view'
    : 'https:\/\/drive.google.com/drive/search?q=' + encodeURIComponent('"' + f.n.replace(/\.[^.]+$/, '').replace(/[\s,]+\d*\s*$/, '') + '"'),
};
