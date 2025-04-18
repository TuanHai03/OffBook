function openBookshelf(){
    GM_registerMenuCommand("📖 Mở Tủ Sách", () => {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OffBook</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Roboto', sans-serif; padding: 20px; }
    h1 { text-align: center; }
    button { padding: 8px 16px; margin: 6px 0; display: block; }
    .container { max-width: 700px; margin: auto; }
    .back-btn { margin-top: 20px; background-color: #eee; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
</head>
<body>
  <div class="container">
    <h1>📚 Tủ Sách</h1>
    <div id="bookList"></div>
    <div id="tocList" style="display:none;"></div>
    <div id="chapterContent" style="display:none;"></div>
  </div>
  <script>
  ${saveAsEpub}
    // Hàm tiện ích
    function hideAndClear(id) {
      const el = document.getElementById(id);
      el.style.display = "none";
      el.innerHTML = "";
    }

    function showBooks(books) {
      window.__books = books;
      const div = document.getElementById("bookList");
      div.style.display = "block";
      div.innerHTML = "";

      books.forEach(b => {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "10px";

  const btn = document.createElement("button");
  btn.textContent = b.data.bookinfo.title || "Không tiêu đề";
  btn.onclick = () => {
    window.__currentBook = b.data;
    showToc(b.data);
  };

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "📥 Tải về";
  downloadBtn.onclick = () => {
   if (typeof saveAsEpub === "function") {
       {if (!Array.isArray(b.data.chapter) || b.data.chapter.length === 0) {
            alert("Không có nội dung để tạo EPUB!");
            return;
        }
                         //content:{
                         //           id:chapter.id,
                         //          title:chapter.title,
                         //          content:chapterContent.trim() ?chapterContent: "Nội dung không có sẵn"}
                         //bookinfo:{ img: imgSrc, author: authorName, title: title }
                         saveAsEpub(b.data);
                        };


    } else {
      alert("Hàm saveAsEpub chưa sẵn sàng! Vui lòng thử lại.");
    }
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️ Xoá";
  deleteBtn.onclick = () => {
    if (confirm( \`Xoá " \${b.data.bookinfo.title}" khỏi thư viện? \`)) {
      const request = indexedDB.open("TruyenDB", 1);
      request.onsuccess = function (e) {
        const db = e.target.result;
        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        store.delete(b.data.bookinfo.url); // b.key chính là url khi lưu
        tx.oncomplete = () => {
          console.log("🗑️ Đã xoá:", b.data.bookinfo.url);
          wrap.remove(); // Xoá khỏi DOM
        };
      };
    }
  };
  wrap.appendChild(btn);
  wrap.appendChild(downloadBtn);
  wrap.appendChild(deleteBtn);
  div.appendChild(wrap);
});

    }

    function showToc(book) {
      hideAndClear("bookList");
      hideAndClear("chapterContent");

      const toc = document.getElementById("tocList");
      toc.style.display = "block";
      toc.innerHTML =\`<h2>\${book.bookinfo.title}</h2>\`;

      if (!Array.isArray(book.chapter) || book.chapter.length === 0) {
        toc.innerHTML += "<p>Không có chương nào.</p>";
      } else {
        book.chapter.forEach(chap => {
          const btn = document.createElement("button");
          btn.textContent = chap.title || "Chương không tên";
          btn.onclick = () => showChapter(chap);
          toc.appendChild(btn);
        });
      }

      const backBtn = document.createElement("button");
      backBtn.textContent = "← Quay lại Tủ Sách";
      backBtn.className = "back-btn";
      backBtn.onclick = () => {
        hideAndClear("tocList");
        showBooks(window.__books);
      };
      toc.appendChild(backBtn);
    }

    function showChapter(chap) {
  hideAndClear("tocList");

  const c = document.getElementById("chapterContent");
  c.style.display = "block";

  const currentBook = window.__currentBook;
  const chapters = currentBook.chapter;
  const index = chapters.findIndex(ch => ch.id === chap.id);

  let html = \`<h3>\${chap.title}</h3><div>\${chap.content}</div><hr>\`;

  // Điều hướng chương
  html +=\`<div style="margin-top:20px;">\`;
  if (index > 0) {
    html += \`<button onclick="showChapter(window.__currentBook.chapter[\${index - 1}])">← Chương trước</button> \`;
  }
  html += \`<button onclick="hideAndClear('chapterContent'); showToc(window.__currentBook)">Mục lục</button> \`;
  if (index < chapters.length - 1) {
    html += \`<button onclick="showChapter(window.__currentBook.chapter[\${index + 1}])">Chương sau →</button>\`;
  }
  html +=\`</div>\`;

  c.innerHTML = html;
}


    // Load dữ liệu từ IndexedDB
    const dbReq = indexedDB.open("TruyenDB", 1);
    dbReq.onsuccess = function(e) {
      const db = e.target.result;
      const tx = db.transaction("books", "readonly");
      const store = tx.objectStore("books");
      const cursor = store.openCursor();
      const books = [];

      cursor.onsuccess = function(e) {
        const cur = e.target.result;
        if (cur) {
          books.push({ url: cur.key, data: cur.value });
          cur.continue();
        } else {
          showBooks(books);
        }
      };
    };
  </script>
</body>
</html>

        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, "_blank");
        if (win) win.focus();
    });}
