const baseRiddles = [
    { q: "Cái gì càng kéo càng ngắn?", a: "điếu thuốc" },
    { q: "Mất đi vào buổi sáng, hiện ra vào buổi tối?", a: "mặt trăng" },
    { q: "Cây xanh xanh, lá xanh xanh, con chim đậu trên cành?", a: "cái cây" },
    { q: "Cái gì đen khi mua, đỏ khi dùng và xám xịt khi vứt đi?", a: "than" },
    { q: "Cái gì có cổ nhưng không có đầu?", a: "cái áo" },
    { q: "Cái gì có răng nhưng không bao giờ cắn?", a: "cái lược" },
    { q: "Con gì đập thì sống, không đập thì chết?", a: "con tim" },
    { q: "Cái gì luôn đến mà không bao giờ đến nơi?", a: "ngày mai" },
    { q: "Cái gì có chân mà không biết đi?", a: "cái bàn" },
    { q: "Bạn có thể cầm nó bằng tay trái nhưng không bao giờ cầm được bằng tay phải?", a: "khuỷu tay phải" },
    { q: "Xã đông nhất là xã nào?", a: "xã hội" },
    { q: "Lịch nào dài nhất?", a: "lịch sử" },
    { q: "Con đường dài nhất là đường nào?", a: "đường đời" },
    { q: "Quần rộng nhất là quần gì?", a: "quần đảo" },
    { q: "Cái gì mà đi thì nằm, đứng cũng nằm, nhưng nằm lại đứng?", a: "bàn chân" },
    { q: "Con gì không chân mà leo núi?", a: "con rắn" },
    { q: "Cây gì không lá, không hoa, không cành?", a: "cây cột đèn" },
    { q: "Nắng ba năm tôi không bỏ bạn, mưa một ngày bạn bỏ tôi là cái gì?", a: "cái bóng" },
    { q: "Cái gì người mua biết, người bán biết, người sử dụng không bao giờ biết?", a: "quan tài" },
    { q: "Con gì sáng đi bằng 4 chân, trưa đi 2 chân, chiều đi 3 chân?", a: "con người" },
    { q: "Bỏ ngoài nướng trong, ăn ngoài bỏ trong là gì?", a: "bắp ngô" },
    { q: "Cái gì trong trắng ngoài xanh, trồng đậu trồng hành rồi thả heo vào?", a: "bánh chưng" },
    { q: "Con gì đầu dê mình ốc?", a: "con dốc" },
    { q: "Cái gì chứa nhiều nước nhất mà không có giọt nào?", a: "bản đồ" },
    { q: "Cái gì càng chia càng nhiều?", a: "nụ cười" },
    { q: "Cái gì có mắt mà không nhìn được?", a: "quả dứa" },
    { q: "Cái gì có cánh mà không bay được?", a: "cánh cửa" },
    { q: "Cái gì có mũi mà không biết ngửi?", a: "mũi giày" },
    { q: "Cái gì có lòng mà không có thân?", a: "lòng bàn tay" },
    { q: "Cái gì có rễ nhưng không có cây?", a: "răng" },
    { q: "Cái gì càng thắng càng thua?", a: "đua xe" },
    { q: "Cái gì có họng nhưng không có miệng?", a: "cái chai" },
    { q: "Cái gì có lưng nhưng không có bụng?", a: "cái ghế" },
    { q: "Cái gì có tai nhưng không biết nghe?", a: "kim khâu" },
    { q: "Cái gì có lưỡi nhưng không biết nói?", a: "con dao" },
    { q: "Cái gì càng cất đi thì càng thấy?", a: "dấu chân" },
    { q: "Tiền gì không dùng để mua đồ?", a: "tiền sử" },
    { q: "Cái gì của mình mà người khác dùng nhiều hơn mình?", a: "cái tên" },
    { q: "Nhà gì không ai muốn ở?", a: "nhà tù" },
    { q: "Sông gì không có nước?", a: "sông ngân hà" },
    { q: "Cá gì không biết bơi?", a: "cá gỗ" },
    { q: "Cái gì có lỗ nhưng giữ được nước?", a: "miếng bọt biển" },
    { q: "Con gì không có xương sống mà vẫn đứng thẳng được?", a: "con đường" },
    { q: "Cái gì càng nặng càng dễ trôi?", a: "mỏ neo" },
    { q: "Cái gì luôn đứng yên ở góc lớp mà đi khắp thế giới?", a: "con tem" },
    { q: "Cái gì có thể phá vỡ mà không cần chạm vào?", a: "lời hứa" },
    { q: "Cái gì có thành phố nhưng không có nhà?", a: "bản đồ" },
    { q: "Cái gì có cổ nhưng không có vai?", a: "cái chai" },
    { q: "Cái gì có một mắt nhưng không thấy gì?", a: "cái kim" },
    { q: "Cái gì đi lên và đi xuống nhưng vẫn ở một chỗ?", a: "cầu thang" }
];

function generate1000Riddles() {
    let pool = [...baseRiddles];

    // Thêm 50 câu đố tính toán logic "mẹo" (Math riddles)
    for (let i = 0; i < 50; i++) {
        const a = Math.floor(Math.random() * 100);
        const b = Math.floor(Math.random() * 100);
        pool.push({ q: `Câu đố logic: ${a} + ${b} bằng bao nhiêu?`, a: (a + b).toString() });
    }

    // Thêm các biến thể đố mẹo về số
    for (let i = 0; i < 400; i++) {
        pool.push({ q: `Tìm số tiếp theo trong dãy: ${i}, ${i + 2}, ${i + 4}...`, a: (i + 6).toString() });
    }

    // Thêm các câu đố mẹo về từ ngữ
    const words = ["mèo", "chó", "gà", "vịt", "chim", "cá", "chuột", "vẹt"];
    for (let i = 0; i < 500; i++) {
        const word = words[i % words.length];
        pool.push({ q: `Đố chữ: Từ '${word}' nếu viết ngược lại là gì?`, a: word.split('').reverse().join('') });
    }

    // Xáo trộn và cắt đúng 1000 câu
    return pool.sort(() => 0.5 - Math.random()).slice(0, 1000);
}

module.exports = generate1000Riddles;
