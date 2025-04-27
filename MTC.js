
class MTC {
    constructor(url) {
        this.url = window.location.href;
        this.origin = window.location.origin; // Lưu host ngay khi khởi tạo
    }
    async getInfo() {
        try {
            // Lấy nội dung JSON-LD từ thẻ script
            let jsonLD = document.querySelector('script[type="application/ld+json"]');
            if (!jsonLD) {
                console.warn("Không tìm thấy dữ liệu JSON-LD.");
                return { img: null, author: "Không rõ", title: "Không rõ" };
            }
            let bookData = JSON.parse(jsonLD.textContent);
            // Trích xuất thông tin
            let title = bookData.name || "Không rõ";
            let author = bookData.author?.name || "Không rõ";
            let img = bookData.image || null;

            return { img, author, title };
        } catch (error) {
            console.error("⚠️ Lỗi khi lấy thông tin sách từ JSON-LD:", error);
            return { img: null, author: "Không rõ", title: "Không rõ" };
        }
    }
    async getToc() {
        try {
            let scriptElements = document.querySelectorAll('script');
            // Tìm script có chứa "id"
            let scriptElement = Array.from(scriptElements).find(script => script.innerHTML.includes('"id":'));

            // Nếu tìm thấy script chứa "id", lấy bookId từ đó
            let bookId = scriptElement ? scriptElement.innerHTML.match(/"id":(\d+)/)[1] : null;
            // Tạo URL API để lấy danh sách chương
            let apiUrl = this.origin.replace("https://", "https://backend.") + "/api/chapters?filter%5Bbook_id%5D=" + bookId + "&filter%5Btype%5D=published";

            // Gửi yêu cầu fetch đến API
            let response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "X-App": "MeTruyenChu"
                }
            });

            // Kiểm tra nếu phản hồi không hợp lệ
            if (!response.ok) {
                console.error("⚠️ Lỗi khi gọi API, mã lỗi:", response.status);
                return [];
            }

            // Xử lý dữ liệu nhận được
            let data = await response.json();

            // Kiểm tra nếu dữ liệu không hợp lệ
            if (!data?.data) {
                console.error("⚠️ Dữ liệu không hợp lệ từ API");
                return [];
            }

            // Chuyển dữ liệu thành danh sách chương
            let chapters = [];
            data.data.forEach(chapter => {
                chapters.push({
                    url: this.url + "/chuong-" + chapter.index,
                    id: chapter.id,
                    title: chapter.name
                });
            });

            return chapters;

        } catch (error) {
            console.error("⚠️ Lỗi khi lấy danh sách chương:", error);
            return [];
        }
    }
    async fetchChapters(chapter, delay=2000, isRaw) {
        let book = [];
        let chapterContent="";
        try {
            // Fetch trang chapter
            let response = await fetch(chapter.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            // Đọc nội dung HTML từ response
            let html = await response.text();
            let doc = new DOMParser().parseFromString(html, 'text/html');
            // Lấy nội dung chương từ DOM
            chapterContent = doc.querySelector("[data-x-bind=ChapterContent]")?.innerHTML || "";

            // Xử lý nội dung chương (thêm các thao tác nếu cần)
            chapterContent = chapterContent.trim() ? chapterContent : "Nội dung không có sẵn";
            // Đợi một khoảng thời gian trước khi tiếp tục lấy chương tiếp theo
            await new Promise(resolve => setTimeout(resolve, delay));
            return {
                id: chapter.id,
                title: chapter.title,
                content: chapterContent
            }
        } catch (error) {
            console.error(`⚠️ Lỗi khi tải chương ${chapter.id}:`, error);
            return{
                id: chapter.id,
                title: chapter.title,
                content: chapterContent||null
            }
        }

    }

}
