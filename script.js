$(async function () {
  const API = "https://www.tikwm.com/api/?url=";
  const el = {
    loadGIF: $(".loadGIF"),

    input: $(".input-btn"),
    enter: $(".enter-btn"),
    paste: $(".paste-btn"),
    clear: $(".clear-btn"),

    des: $(".des"),
    container: $("#s2 .container"),

    pageDown: $(".pageDown"),
    preVid: $(".preVid img"),
    prePic: $(".prePics"),
    downVid: $(".downVid"),
    downPics: $(".downPics"),
    downAudio: $(".downAudio"),
  };

  // Ẩn loadGIF sau 1.5s
  setTimeout(() => {
    el.loadGIF.hide();
  }, 1500);

  // Hàm lấy dữ liệu từ API
  async function fetchData(api, input) {
    try {
      const res = await axios.get(`${api}${input}`);
      if (res.data.code === 0) {
        console.log(res.data);
        return res.data.data;
      } else {
        alert(
          "Vui lòng nhập link cần lấy dữ liệu!!\nNếu không được bạn vui lòng kiểm tra lại link <3"
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Có lỗi xảy ra khi lấy dữ liệu!");
      return null;
    }
  }

  // Hàm xử lý tải về
  async function getDownUrl(e, d) {
    if (!d) return;

    try {
      const res = await fetch(d);
      const blob = await res.blob();
      const file = new File([blob], "image", { type: blob.type });
      const url = URL.createObjectURL(file);

      if (e) {
        e.attr("href", url);
        return { url };
      }
      return { url, file, type: blob.type };
    } catch (error) {
      console.error("Error fetching content:", error);
      return null;
    }
  }

  // Hàm xử lý thông tin từ API
  async function getData(api, input) {
    const data = await fetchData(api, input);
    if (!data) return;
    el.des.remove();

    // Cập nhật thời gian bài đăng
    function formatDuration(duration) {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes} phút ${seconds} giây`;
    }

    // Mẫu thông tin
    const fields = [
      {
        icon: "fa-duotone fa-id-badge",
        className: "authorID",
        text: `UserID: ${data.author.unique_id}`,
      },
      {
        icon: "fa-duotone fa-user",
        className: "authorName",
        text: `Tên tài khoản: ${data.author.nickname}`,
      },
      {
        icon: "fa-duotone fa-subtitles",
        className: "title",
        text: `Tiêu đề bài viết: ${data.title}`,
      },
      {
        icon: "fa-duotone fa-comments",
        className: "comment_count",
        text: `Số bình luận: ${data.comment_count}`,
      },
      {
        icon: "fa-duotone fa-circle-heart",
        className: "digg_count",
        text: `Số tim: ${data.digg_count}`,
      },
      {
        icon: "fa-duotone fa-circle-down",
        className: "download_count",
        text: `Số lượt tải xuống: ${data.download_count}`,
      },
      {
        icon: "fa-duotone fa-timer",
        className: "duration",
        text: `Thời gian bài viết: ${formatDuration(data.duration)}`,
      },
      {
        icon: "fa-duotone fa-circle-play",
        className: "play_count",
        text: `Số lượt xem: ${data.play_count}`,
      },
      {
        icon: "fa-duotone fa-file",
        className: "size",
        text: `Dung lượng: ${
          data.size
            ? (data.size / 1000000).toFixed(3) + "MB"
            : "Mỗi ảnh kích thước khác nhau!"
        }`,
      },
    ];

    // Background chờ
    var waittime = 0;
    const loadDown = $("<div>", { class: "loader-wrapper" })
      .append(
        $("<span>", { class: "loader" }).append(
          $("<span>", { class: "loader-inner" })
        )
      )
      .append(
        $("<span>", { class: "timeWaiting" }).text(
          "Đang xử lí, vui lòng chờ..."
        )
      );
    $("#s3").css("display", "none");
    $("body").append(loadDown);

    // Hiển thị thông tin
    const boxInfo = $("<div>", { class: "info" });
    el.container.append(boxInfo);
    $(".info .infoThis").remove();

    fields.forEach((item) => {
      const itemInfo = $("<div>", { class: "infoThis" });
      const icon = $("<i>", { class: item.icon });
      const des = $("<span>", { class: item.className }).text(item.text);

      itemInfo.append(icon).append(des);
      boxInfo.append(itemInfo);
    });

    // Xử lý Video
    if (!data.images) {
      if (el.downPics) {
        $(".downPics").remove();
      }
      el.downVid.css("display", "block");
      el.preVid.css("display", "block");
      $(".prePics .pic").remove();

      el.preVid.attr("src", data.ai_dynamic_cover);
      getDownUrl(el.downAudio, data.music);
      getDownUrl(el.downVid, data.play);

      const { url } = await getDownUrl(el.downVid, data.play);
      if ($(".downVid").attr("href") == url) {
        $("#s3").css("display", "block");
        $(".loader-wrapper").remove();
        console.log(await getDownUrl(el.downVid, data.play));
      }
    }

    // Xử lý Ảnh
    else {
      if (el.downPics) {
        $(".downPics").remove();
      }
      el.downVid.css("display", "none");
      el.preVid.css("display", "none");
      $(".prePics .pic").remove();

      const zip = new JSZip();
      const folder = zip.folder("images");
      getDownUrl(el.downAudio, data.music);

      data.images.forEach(async (imgUrl, index) => {
        const { url, type, file } = await getDownUrl(null, imgUrl);
        const pic = $("<div>", { class: "pic" });
        const imgPic = $("<img>").attr("src", imgUrl);
        const hrefPic = $("<a>", { class: "downPic" })
          .attr({ href: url, download: `Ảnh ${index + 1}` })
          .text("Tải về");

        folder.file(`Ảnh${index + 1}.${type.split("/")[1]}`, file);
        el.prePic.append(pic.append(imgPic).append(hrefPic));

        setTimeout(() => {
          $("#s3").css("display", "block");
          $(".loader-wrapper").remove();
        }, 1000);
      });

      // Xử lí và tạo nút tải tất cả ảnh
      const zipBtn = $("<div>", { class: "downPics" })
        .append($("<i>", { class: "fa-duotone fa-download" }))
        .append($("<span>").text("ALBUM"));
      zipBtn.on("click", async () => {
        try {
          const content = await zip.generateAsync({ type: "blob" });
          const zipUrl = URL.createObjectURL(content);
          const downLink = $("<a>").attr({
            href: zipUrl,
            download: "images.zip",
          });

          // el.downPics.append(downLink);
          downLink[0].click();
          URL.revokeObjectURL(zipUrl);
        } catch (error) {
          console.error("Lỗi khi tạo và tải xuống tệp zip:", error);
        }
      });
      el.pageDown.prepend(zipBtn);
    }
  }

  // Tải về
  el.enter.click(() => {
    getData(API, el.input.val());
    el.input.val("").css("background", "");
  });

  // Dán liên kết
  el.paste.click(async () => {
    const paste = await navigator.clipboard.readText();
    el.input.val(paste).css("background", "#96efff");
  });

  // Xóa tìm kiếm
  el.clear.click(() => {
    el.input.val("").css("background", "");
  });
});
