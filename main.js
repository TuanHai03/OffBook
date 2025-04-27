// ==UserScript==
// @name         Modal Cài Đặt Tải Chương
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Thêm modal cài đặt tải chương
// @author       Bạn
// @match        *://metruyencv.com/truyen/*
// @match        *://metruyencv.biz/truyen/*
// @match        *://sangtacviet.app/truyen/*/1/*/*/
// @match        *://sangtacviet.vip/truyen/*/1/*/*/
// @grant   GM_openInTab
// @grant   GM_registerMenuCommand
// @grant   GM_setValue
// @grant   GM_getValue
// @grant   GM_deleteValue
// @grant   GM_xmlhttpRequest
// @grant   GM_download
// @require https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @require https://raw.githubusercontent.com/TuanHai03/OffBook/refs/heads/main/MTC.js
// @require https://raw.githubusercontent.com/TuanHai03/font/refs/heads/main/mapfontstv.js
// @require https://raw.githubusercontent.com/TuanHai03/OffBook/refs/heads/main/downepub.js
// ==/UserScript==
function saveTruyen(url, data) {
    const request = indexedDB.open("bdatabase", 2);  // Cập nhật version của cơ sở dữ liệu lên 2
    request.onupgradeneeded = function (e) {
        const db = e.target.result;

        // Nếu object store "books" chưa tồn tại, tạo mới
        if (!db.objectStoreNames.contains("books")) {
            const store = db.createObjectStore("books"); // Sử dụng 'url' làm key
            console.log("Object store 'books' đã được tạo.");
        }
    };

    request.onsuccess = function (e) {
        try{
        const db = e.target.result;
        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        store.put(data, url);
        tx.oncomplete = () => console.log("✅ Đã lưu:", url);
        }catch{
        alert("Có lỗi khi lưu dữ liệu")
        }
        
    };

    request.onerror = function (e) {
        console.error("Lỗi khi mở cơ sở dữ liệu:", e.target.error);
    };
}
async function getbookdata(key=null) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("bdatabase", 2);
request.onupgradeneeded = function (e) {
        const db = e.target.result;

        // Nếu object store "books" chưa tồn tại, tạo mới
        if (!db.objectStoreNames.contains("books")) {
            const store = db.createObjectStore("books"); // Sử dụng 'url' làm key
            console.log("Object store 'books' đã được tạo.");
        }
    };
        request.onsuccess = function (e) {
            const db = e.target.result;
            const tx = db.transaction("books", "readonly");
            const store = tx.objectStore("books");
            if(key!=null){
                const getRequest = store.get(key);

            getRequest.onsuccess = function (event) {
                resolve(event.target.result); // Đây là value
            };

            getRequest.onerror = function () {
                reject("Lỗi khi lấy truyện theo key");
            };
            }
            else{
            const getAllRequest = store.getAll(); // Lấy tất cả truyện đã lưu

            getAllRequest.onsuccess = function () {
                const books = getAllRequest.result;
                if (books.length === 0) {
                    console.log("Chưa có truyện nào đã tải");
                    resolve(null);  // Trả về null nếu không có truyện
                } else {
                    resolve(books);  // Trả về danh sách truyện
                }
            };

            getAllRequest.onerror = function () {
                reject("Lỗi khi lấy dữ liệu truyện.");
            };}
        };

        request.onerror = function () {
            reject("Lỗi khi mở cơ sở dữ liệu.");
        };
    });
}
async function checkchap(chap, bookUrl) {
    return new Promise(resolve => {
        const request = indexedDB.open("bdatabase", 2);
        request.onupgradeneeded = function (e) {
        const db = e.target.result;

        // Nếu object store "books" chưa tồn tại, tạo mới
        if (!db.objectStoreNames.contains("books")) {
            const store = db.createObjectStore("books"); // Sử dụng 'url' làm key
            console.log("Object store 'books' đã được tạo.");
        }
    };
        request.onsuccess = function (e) {
            const db = e.target.result;
            const tx = db.transaction("books", "readonly");
            const store = tx.objectStore("books");
            const getReq = store.get(bookUrl);

            getReq.onsuccess = function () {
                const savedBook = getReq.result;
                if (!savedBook || !Array.isArray(savedBook.chapter)) {
                    // Nếu chưa có dữ liệu hoặc không có chương nào
                    console.log("ko có")
                    resolve(false); // Chương chưa có, có thể tải
                } else {
                    const existingChapter = savedBook.chapter.find(c => c.id === chap.id);
                    if (existingChapter) {
                        // Nếu chương đã có trong savedBook
                        console.log(existingChapter)
                        resolve(existingChapter); // Chương đã tồn tại, không cần tải
                    } else {
                        console.log("ko ")
                        resolve(false); // Chương chưa có, có thể tải
                    }
                }
            };
        };
    });
}
async function loadimg(url) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            headers: { referer: window.location.origin + "/" }, // Thêm referer nếu cần
            responseType: "blob", // Tải về dưới dạng Blob
            onload: function (response) {
                let blob = response.response;
                let reader = new FileReader();

                reader.onloadend = function () {
                    let base64 = reader.result;
                    if (base64.startsWith("data:image")) {
                        resolve(base64); // Trả về ảnh dưới dạng base64
                    } else {
                        reject("Dữ liệu không phải ảnh hợp lệ.");
                    }
                };

                reader.readAsDataURL(blob);
            },
            onerror: function (error) {
                reject("Lỗi khi tải ảnh: " + error);
            }
        });
    });
}
async function down(toc,book){
    let startChapter = parseInt(document.getElementById("startChapter").value);
    let endChapter = parseInt(document.getElementById("endChapter").value);
    let delay = parseInt(document.getElementById("timeoutInput").value) || 5000; // Nếu không hợp lệ, đặt 2000ms
    let donw = document.getElementById("continueDownloadCheckbox").checked || true;
    let checkboxElement = document.getElementById("defaultTextCheckbox");
let isRaw = checkboxElement ? checkboxElement.checked : false;
    //alert(startChapter+"/"+endChapter+"/"+delay)
    let bookinfo=await book.getInfo();
    if(delay<2000){
        let userChoice = window.confirm("Thời gian delay thấp có thể gây lỗi hoặc bị ban!");
        if (!userChoice) {
            return;
        }
    }
    if (startChapter < 1 || endChapter > toc.length || startChapter > endChapter) {
        alert("Vui lòng nhập dải chương hợp lệ.");
        return;
    }
    let selectedChapters = toc.slice(startChapter - 1, endChapter);
    let currentProgress = 0;
    let chapter=[];
document.getElementById('starBtn').disabled = true;
        for (const c of selectedChapters) {
            let percentage = (currentProgress / selectedChapters.length) * 100;
            updateCustomProgressBar(percentage,startChapter-1,endChapter)
            if(GM_getValue("isCancelled",false)){
                console.log("Tải đã bị hủy.");
                break;
            }
            try{
                if(donw==0){
                    let res=await checkchap(c,bookinfo.url)
                    if(res==false){
                        chapter.push(await book.fetchChapters(c, delay, isRaw));
                    }
                    else{
                        chapter.push(res)}
                }
                else{chapter.push(await book.fetchChapters(c, delay, isRaw));}
console.log(chapter)

                 currentProgress++;
              startChapter++;
            } catch (error) {
                console.error("Lỗi khi tải chương", error);
            }

        }
    document.getElementById('starBtn').disabled = false;
        GM_setValue("isCancelled", false);
        let result = {bookinfo:bookinfo,
                      chapter: chapter
                     }
        saveTruyen(result.bookinfo.url,result);
        console.log(result)
    }
async function load(key,index=null){
    const tocGrid = document.querySelector('.toc-grid');
        tocGrid.innerHTML = ''; // Xóa nội dung cũ (nếu có)
        let books=await getbookdata(key)
        books=books.chapter
    if(index!=null){
document.getElementById("chapter").innerHTML=books[index].content
    }
        console.log(books)
                // Lặp qua tất cả các truyện và tạo button cho mỗi truyện
                books.forEach((book,index) => {
                    const tocItem = document.createElement('div');
                    tocItem.classList.add('toc-item');
                    const button = document.createElement('button');
                    button.classList.add('toc-btn');
                    button.textContent = book.title || "Tên truyện"; // Giả sử bạn có thuộc tính title trong data
                    button.setAttribute('index', index);
                    button.setAttribute('data-key', key);
                    tocItem.appendChild(button);
                    tocGrid.appendChild(tocItem);
                });
}
function updateCustomProgressBar(value,start,end) {
    const progressBar = document.getElementById('progressBar');
    const progressValue = document.getElementById('txt-progress');
    progressBar.value = value;
    progressValue.innerText = ` ${Math.round(value)}% (${start}/${end}) `;
}
(async function() {
    'use strict';
    let chaptersToDownload = 0;
    let book=null;
    let istxt="";
    switch (window.location.origin) {
        case "https://sangtacviet.app":
        case "https://sangtacviet.vip":
            istxt='<label><input type="checkbox" id="defaultTextCheckbox"> Text Trung(Chỉ áp dụng cho STV)</label>'
            //book = new STV();// Gán đối tượng book khi URL là sangtacviet.app hoặc sangtacviet.vip
            break;
            case "https://metruyencv.biz":
        case "https://metruyencv.com":
            book = new MTC();// Xử lý cho metruyencv.com
            break;
        default:
            // Nếu không phải là một trong các miền trên
            console.log("URL không hợp lệ hoặc không hỗ trợ.");
            break;
    }
    let totalChapters=1;
    let toc=[];
    if(book!=null){
        toc=await book.getToc()
        totalChapters=toc.length;
        console.log(toc)
    }

    // Tạo khối HTML
    const modalHTML = `
<div class="modal" id="myModal" style="display:none;">
  <div class="modal-header">
    Cài Đặt
  </div>
  <div class="modal-body">
    <div class="tabs">
      <div class="tab active" id="tab-basic">Cài đặt tải xuống</div>
      <div class="tab" id="tab-filter">Danh sách truyện đã tải</div>
      <div class="tab" id="tab-progress">Tiến độ: <progress id="progressBar" value="0" max="100"></progress> <i id="txt-progress"> 0% </i></div>
    </div>
    <div id="content-basic" class="tab-content">
    <div id="setting">
      <div class="section">
        <label>Chương bắt đầu <input type="number" id="startChapter" min="1" value="1"></label>
        <label>Chương kết thúc <input type="number" id="endChapter" min="1" max="${totalChapters}" value="${totalChapters}"></label>
        <label>Thời gian tải giữa các chương(ms)<input type="number" id="timeoutInput" min="2000" value="2000">
        </label>
      </div>

      <hr>

      <div class="section">
${istxt}
    <label><input type="checkbox" id="continueDownloadCheckbox"> Tải tiếp</label>
    <label><input type="checkbox" id="reverseOrderCheckbox"> Đảo ngược thứ tự chương</label>
</div>
      
    </div>
    <div class="actions">
      <button id="starBtn">Bắt đầu</button>
      <button id="stopBtn">Dừng lại</button>
      <button id="saveBtn">Lưu cài đặt</button>
      <button class="cancelBtn">Đóng</button>
    </div>
</div>
    <div id="content-filter" class="tab-content" style="display:none;">
    <div id="menu">
      <div id="book" class="book-grid">
        <button class="book-btn">test</button>
      </div>
      <div id="toc" class="toc-grid" style="display: none;">
    <ul>
        <li><button class="toc-btn" id="toc-1">Chapter 1</button></li>
        <li><button class="toc-btn" id="toc-2">Chapter 2</button></li>
    </ul>
    </div>
    <div id="chapter" style="display: none;"> add </div>
</div>
      <div class="actions">
      <button id="backBtn">Quay lại</button>
      <button class="cancelBtn">Đóng</button>
    </div>
    </div>

    
  </div>
</div>
<button id="openModalBtn" style="position: fixed; bottom: 20px; right: 20px; padding:10px 20px; background-color:#ff6699; color:black; border:none; border-radius:5px; cursor:pointer;">Mở Cài Đặt</button>
`;

    // CSS style
    const style = document.createElement('style');
    style.innerHTML = `
    #myModal {
     color: black !important;
}
.modal {
    width: 80%;  /* Đặt modal chiếm 80% chiều rộng màn hình */
    max-width: 700px;  /* Đặt chiều rộng tối đa là 700px */
    margin: 50px auto;  /* Căn giữa modal */
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    z-index: 9999;
    position: fixed;
    top: 5%;  /* Cách từ trên 10% chiều cao màn hình */
    left: 50%;  /* Căn giữa theo chiều ngang */
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;  /* Đặt nội dung theo chiều dọc */
    height: 90%;  /* Đặt chiều cao của modal */
  bottom: 5%;
}

.modal-header {
  background-color: #ff6699;
  color: black;
  padding: 15px;
  font-size: 24px;
  text-align: center;
}
#progressBar {
    width: 100%;  /* Đảm bảo thanh tiến độ chiếm hết chiều rộng của phần tử chứa */
    height: 20px;  /* Chiều cao của thanh tiến độ */
}

#txt-progress {
    font-weight: bold;
    display: inline-block;
    margin-left: 10px;
}
.modal-body {
flex: 1;
  padding: 20px;
}
.tabs {
  display: flex;
   color: black !important;
  border-bottom: 1px solid #ccc;
}
.tab {
  padding: 10px 20px;
  cursor: pointer;
  background: #f0f0f0;
}
.tab.active {
  font-weight: bold;
   color: black !important;
  background: white;
  border-bottom: 2px solid black;
}
.section label {
  display: block;
  margin: 5px 0;
}

input[type="checkbox"] {
  appearance: checkbox;
  -webkit-appearance: checkbox;
  -moz-appearance: checkbox;
  vertical-align: middle;
  margin-right: 5px;
}


.book-grid {
    display: grid;
    gap: 10px; /* Khoảng cách giữa các nút */
    margin-top: 20px;
}
.book-item {
    display: grid;
    grid-template-columns: 3fr 1fr; /* 3 phần cho book-btn, 1 phần cho nút khác */
    gap: 10px;
    margin-top: 20px;
    align-items: center; /* Căn giữa các phần tử theo chiều dọc */
}

.book-btn {
    padding: 10px;
    background-color: #32c787;
    border: 2px solid #32c787;
    color: black;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    text-align: center;
    width: 100%;
}
.book-btn:hover {
    background-color: #ff3366;
}

.actions {
  text-align: center;
  margin-top: 20px;
}
button:hover {
  background-color: #ff3366;
}
h1 {
    font-size: 38px;
    text-align: center;
    margin-top: 10px;         /* Giảm khoảng cách trên */
    margin-bottom: 10px;      /* Giảm khoảng cách dưới */
    white-space: nowrap;      /* Không cho chữ xuống dòng */
    overflow: visible;        /* Hiển thị chữ đầy đủ */
    text-overflow: ellipsis;  /* Hiển thị '...' nếu chữ dài quá */
}
#menu {
max-height: 300px;
  overflow-y: scroll;
}
input[type="number"] {
    width: 100%; /* Chiếm toàn bộ chiều rộng của phần tử chứa */
    padding: 8px;
    box-sizing: border-box; /* Đảm bảo padding và border không làm thay đổi kích thước */
    margin: 5px 0; /* Tạo khoảng cách giữa các ô input */
}
.action-buttons {
    display: flex;
    justify-content: space-between;  /* Chia đều các nút */
    gap: 10px;  /* Khoảng cách giữa các nút */
    padding: 10px;
    background-color: #f0f0f0;
}

.action-buttons button {
    flex: 1;  /* Các nút chiếm đều không gian */
    padding: 10px;
    background-color: #32c787;
    border: none;
    border-radius: 5px;
    color: white;
    cursor: pointer;
    text-align: center;
}

.action-buttons button:hover {
    background-color: #ff3366;
}
.setting{
max-height: 300px;
overflow-y: scroll;
}
`;
    document.head.appendChild(style);

    // Gắn HTML vào trang
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div);

    // Chức năng tab
    // Hàm để hiển thị tab
    function showTab(tabId) {
        const allTabs = document.querySelectorAll('.tab');
        const allContents = document.querySelectorAll('.tab-content');

        // Ẩn tất cả các tab và nội dung
        allTabs.forEach(tab => tab.classList.remove('active'));
        allContents.forEach(content => content.style.display = 'none');

        // Hiển thị tab được chọn
        document.getElementById('tab-' + tabId).classList.add('active');
        document.getElementById('content-' + tabId).style.display = 'block';
        if (tabId === 'filter') {
            displaySavedBooks();
        }
    }

    // Gán sự kiện click cho các tab
    document.getElementById('tab-basic').addEventListener('click', () => showTab('basic'));
    document.getElementById('tab-filter').addEventListener('click', () => showTab('filter'));
    // Chức năng mở modal
    document.getElementById('openModalBtn').addEventListener('click', () => {
        const modal = document.getElementById('myModal');
        modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
        const defaultTextChecked = GM_getValue('defaultText',false); // Giá trị mặc định là false (unchecked)
        const continueDownloadChecked = GM_getValue('continueDownload',false); // Giá trị mặc định là false
        const reverseOrderChecked = GM_getValue('reverseOrder',false); // Giá trị mặc định là false
        const timeout = GM_getValue('timeout', 2000);
        console.log(timeout)
        // Cập nhật trạng thái checkbox khi mở modal
        if(istxt!=""){
            document.getElementById('defaultTextCheckbox').checked = defaultTextChecked;
        }

        document.getElementById('continueDownloadCheckbox').checked = continueDownloadChecked;
        document.getElementById('reverseOrderCheckbox').checked = reverseOrderChecked;
        document.getElementById('timeoutInput').value = timeout;
    });
    document.getElementById('starBtn').addEventListener('click', () => {
        down(toc,book)
    });
    document.getElementById('stopBtn').addEventListener('click', () => {
        GM_setValue("isCancelled", true);
    });
    // Khi người dùng nhấn "Lưu", lưu trạng thái checkbox
    document.getElementById('saveBtn').addEventListener('click', () => {
        if(istxt!=""){
        const defaultTextChecked = document.getElementById('defaultTextCheckbox').checked;
            GM_setValue('defaultText', defaultTextChecked);
        }
        const continueDownloadChecked = document.getElementById('continueDownloadCheckbox').checked;
        const reverseOrderChecked = document.getElementById('reverseOrderCheckbox').checked;
        const timeout = document.getElementById('timeoutInput').value;
        // Lưu trạng thái checkbox vào GM_setValue
        
        GM_setValue('continueDownload', continueDownloadChecked);
        GM_setValue('reverseOrder', reverseOrderChecked);
        GM_setValue('timeout', timeout);
        alert('Cài đặt đã được lưu!');
    });
    // Lấy tất cả các nút "Đóng" có class "cancelBtn"
    const cancelButtons = document.querySelectorAll('.cancelBtn');
    // Lặp qua từng nút và gán sự kiện
    cancelButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('myModal').style.display = 'none';
        });
    });
        let titlebook="";
   async function displaySavedBooks() {
        const bookGrid = document.querySelector('.book-grid');
        bookGrid.innerHTML = ''; // Xóa nội dung cũ (nếu có)
        let books=await getbookdata()
        console.log(books)
                // Lặp qua tất cả các truyện và tạo button cho mỗi truyện
                books.forEach(book => {
                    const bookItem = document.createElement('div');
                    bookItem.classList.add('book-item');

                    const button = document.createElement('button');
                    button.classList.add('book-btn');
                    button.textContent = book.bookinfo.title || "Tên truyện"; // Giả sử bạn có thuộc tính title trong data
                    button.setAttribute('data-key', book.bookinfo.url);
                    const actionButtons = document.createElement('div');
                    actionButtons.classList.add('action-buttons');

                    const downloadButton = document.createElement('button');
                    downloadButton.textContent = "Tải xuống";
                    downloadButton.addEventListener('click', () => {
                        console.log(book)
                        saveAsEpub(book)
                        alert('Đang tải xuống: ' + book.bookinfo.title);
                    });

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = "Xóa";
                    deleteButton.addEventListener('click', () => {
                        // Logic xóa truyện khỏi cơ sở dữ liệu
                        deleteBook(book.bookinfo.url);
                        displaySavedBooks(); // Cập nhật lại danh sách
                    });

                    actionButtons.appendChild(downloadButton);
                    actionButtons.appendChild(deleteButton);

                    bookItem.appendChild(button);
                    bookItem.appendChild(actionButtons);
                    bookGrid.appendChild(bookItem);
                });
    }
    function deleteBook(url) {
        const request = indexedDB.open("bdatabase", 2);
        request.onsuccess = function (e) {
            const db = e.target.result;
            const tx = db.transaction("books", "readwrite");
            const store = tx.objectStore("books");
            store.delete(url); // Xóa truyện theo url
            tx.oncomplete = function () {
                console.log("✅ Đã xóa truyện với url:", url);
            };
        };

        request.onerror = function () {
            console.error('❌ Lỗi khi mở cơ sở dữ liệu');
        };
    }
    let currentState = 'book'; // Mặc định là ở "book"
// Hàm để thay đổi trạng thái và hiển thị phần nội dung tương ứng
function changeState(newState) {
    // Ẩn tất cả các phần
    document.getElementById('book').style.display = 'none';
    document.getElementById('toc').style.display = 'none';
    document.getElementById('chapter').style.display = 'none';

    // Hiển thị phần mới dựa trên trạng thái
    if (newState === 'book') {
        document.getElementById('book').style.display = 'block';
    } else if (newState === 'toc') {
        document.getElementById('toc').style.display = 'block';
    } else if (newState === 'chapter') {
        document.getElementById('chapter').style.display = 'block';
    }

    // Lưu trạng thái hiện tại
    currentState = newState;
}
document.addEventListener('click', (event) => {
    if (event.target && event.target.classList.contains('book-btn')) {
        const button = event.target; // lấy ra cái nút vừa click
        const dataKey = button.getAttribute('data-key'); // lấy giá trị data-key
        const toc = document.getElementById("toc");
        if (toc) {
            // Ẩn các phần khác
            document.querySelector('.book-grid').style.display = 'none';
            document.getElementById('chapter').style.display = 'none';

            // Hiện TOC
            changeState('toc');
            // Gọi loadtoc với key
            load(dataKey); // <-- truyền đúng dataKey
        }
    }
});
document.getElementById('backBtn').addEventListener('click', () => {
if (currentState === 'chapter') {
        changeState('toc');  // Quay lại TOC từ Chapter
    }
    else if (currentState === 'toc') {
        changeState('book');  // Quay lại Book từ TOC
    }
    });
document.addEventListener('click', (event) => {
    if (event.target && event.target.classList.contains('toc-btn')) {
        const button = event.target; // lấy ra cái nút vừa click
        const dataKey = button.getAttribute('data-key'); // lấy giá trị data-key
        const index=button.getAttribute('index');
        const chap = document.getElementById("chapter");
        if (toc) {
            // Ẩn các phần khác
            document.querySelector('.book-grid').style.display = 'none';
            document.getElementById('toc').style.display = 'none';

            // Hiện TOC
            changeState('chapter');
            // Gọi loadtoc với key
            load(dataKey,index); // <-- truyền đúng dataKey
        }
    }
});


})();
