<script>
  import "./app.css";
  import {
    Card,
    Input,
    Label,
    A,
    Alert,
    Select,
    Toggle,
    Button,
    ButtonGroup,
    Range,
  } from "flowbite-svelte";
  import {Game, colorLog} from "./game";

  let setted = false;
  let image = null;
  let audio = null;
  let files = {
    init() {
      image = localStorage.getItem("image");
      audio = localStorage.getItem("audio");
      if (image && audio) {
        setted = true;
      }
    },
    loadImage(file) {
      console.log(file);
      // load image as blob
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          // @ts-ignore
          localStorage.setItem("image", e.target.result);
          image = e.target.result;
          if (audio) {
            setted = true;
          }
        };
        // @ts-ignore
        reader.readAsDataURL(file);
      }
    },
    loadAudio(file) {
      console.log(file);
      // load audio from file
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          // @ts-ignore
          localStorage.setItem("audio", e.target.result);
          audio = e.target.result;
          if (image) {
            setted = true;
          }
        };
        // @ts-ignore
        reader.readAsDataURL(file);
      }
    },

    defaultSetting() {
      localStorage.setItem("image", "default.gif");
      localStorage.setItem("audio", "default.mp3");
      image = "default.gif";
      audio = "default.mp3";
      setted = true;
    },

    clearSetting() {
      console.log("clear setting");
      localStorage.removeItem("image");
      localStorage.removeItem("audio");
      image = null;
      audio = null;
      setted = false;
    },
  };

  files.init();

  // get config from url query
  const urlParams = new URLSearchParams(window.location.search);
  const plug_env = urlParams.get("plug_env") != "0";

  let config = {
    display_time: 3,
    show_free: true,
  };

  config.display_time = parseInt(urlParams.get("display_time")) || 3;
  config.show_free = urlParams.get("show_free") == "1";

  let validLink = false;
  // params for verify
  const Code = urlParams.get("Code") || "";
  const Caller = urlParams.get("Caller") || "";
  const Mid = urlParams.get("Mid") || "";
  const Timestamp = urlParams.get("Timestamp") || "";
  const CodeSign = urlParams.get("CodeSign") || "";

  if (!Code || !Caller || !Mid || !Timestamp || !CodeSign) {
    colorLog("invalid link", "red");
  } else {
    Game.verify(Caller, Code, Mid, Timestamp, CodeSign, (code) => {
        validLink = code == 0;
        if (!validLink) {
          colorLog("invalid link", "red");
          return;
        }
        if (plug_env) {
          const localConfig = localStorage.getItem("config");
          if (localConfig) {
            console.log("load config from local");
            Object.assign(config, JSON.parse(localConfig));
          }
        }
        const game = new Game(Code, handler);
        game.startGame();
        window.onbeforeunload = () => {
          if (game) {
            game.stopGame();
          }
          console.log("game stop by window close");
        };
        giftProcessorStart();
    });
  }
  

  // gift queue process
  let giftQueue = [];
  let delay = false;

  const CMD_SUPERCHAT = "LIVE_OPEN_PLATFORM_SUPER_CHAT";
  const CMD_GUARD = "LIVE_OPEN_PLATFORM_GUARD";
  const CMD_GIFT = "LIVE_OPEN_PLATFORM_SEND_GIFT";
  const handler = (msg) => {
    switch (msg.cmd) {
      case CMD_GIFT:
        // filter free gift
        if (!config.show_free && !msg.data.paid) {
          return;
        }
        const gift_item = {
          id: msg.data.open_id + msg.data.gift_id,
          type: "gift",
          uname: msg.data.uname,
          gift_name: msg.data.gift_name,  
          gift_num: msg.data.gift_num,
        }
        // if id is in queue, update gift num, and move it to the end
        const idx = giftQueue.findIndex((item) => item.id == gift_item.id);
        if (idx != -1) {
          giftQueue[idx].gift_num += gift_item.gift_num;
          giftQueue.push(giftQueue.splice(idx, 1)[0]);
          if (giftQueue.length == 1) {
            delay = true;
          }
        } else {
          giftQueue.push(gift_item);
        }
        break;
      case CMD_GUARD:
        const guard_item = {
          id: msg.data.msg_id,
          type: "guard",
          uname: msg.data.uname,
          guard_level: msg.data.guard_level,
          guard_num: msg.data.guard_num,
          guard_unit: msg.data.guard_unit,
        }
        giftQueue.push(guard_item);
        break;
      case CMD_SUPERCHAT:
        const superchat_item = {
          id: msg.data.id,
          type: "superchat",
          uname: msg.data.uname,
          price: msg.data.rmb,
          message: msg.data.message,
        }
        giftQueue.push(superchat_item);
        break;
      default:
        break;
    }
  }

  if (plug_env) {
    // generate data to handler for demonstration
    const datas = [{
      cmd: CMD_GIFT,
      data: {
        open_id: "joi",
        uname: "Xinrea",
        gift_id: "test",
        gift_name: "礼物",
        gift_num: Math.floor(Math.random() * 100),
        paid: Math.random() > 0.5,
      }
    },{
      cmd: CMD_GUARD,
      data: {
        msg_id: "joi",
        uname: "Xinrea",
        guard_level: Math.floor(Math.random() * 3) + 1,
        guard_num: Math.floor(Math.random() * 2),
        guard_unit: "月",
      }
    },{
      cmd: CMD_SUPERCHAT,
      data: {
        id: "joi",
        uname: "Xinrea",
        rmb: Math.floor(Math.random() * 100),
        message: "你好" + Math.floor(Math.random() * 100),
      }
    }];
    const next = () => {
      setTimeout(() => {
        handler(datas[Math.floor(Math.random() * 3)]);
        next();
      }, Math.floor(Math.random() * 10) * 1000);
    }
    next();
  }

  let show = false;
  let rendered_html = "";

  function levelToGuard(level) {
    switch (level) {
      case 1:
        return "总督";
      case 2:
        return "提督";
      case 3:
        return "舰长";
      default:
        return "舰长";
    }
  }

  const render = {
    showGift: (uname, gift_name, gift_num) => {
      show = true;
      rendered_html = `<span class="key">${uname}</span> 投喂了 <span class="key">${gift_num}</span> 个 <span class="key">${gift_name}</span>`;
      let audioElem = document.getElementById("audioplay");
      if (audioElem) {
        audioElem.play();
      }
    },
    showGuard: (uname, guard_level, guard_num, guard_unit) => {
      show = true;
      rendered_html = `<span class="key">${uname}</span> 开通了 <span class="key">${guard_num}</span><span class="key">${guard_unit}</span><span class="key">${levelToGuard(guard_level)}</span>`;
      let audioElem = document.getElementById("audioplay");
      if (audioElem) {
        audioElem.play();
      }
    },
    showSuperchat: (uname, price, message) => {
      show = true;
      rendered_html = `<span class="key">${uname}</span> 发送了 <span class="key">${price}</span> 元的醒目留言：<br><span class="flex key w-full justify-center">${message}</span>`;
      let audioElem = document.getElementById("audioplay");
      if (audioElem) {
        audioElem.play();
      }
    },
  }

  function giftProcessorStart() {
    colorLog("[proccess] gift queue: " + giftQueue.length + ", interval: " + config.display_time, "green");
    show = false;
    if (!setted) {
      return;
    }
    if (delay) {
      delay = false;
      return;
    }
    if (giftQueue.length > 0) {
      const gift = giftQueue.shift();
      if (gift.type == "gift") {
        render.showGift(gift.uname, gift.gift_name, gift.gift_num);
      } else if (gift.type == "guard") {
        render.showGuard(gift.uname, gift.guard_level, gift.guard_num, gift.guard_unit);
      } else if (gift.type == "superchat") {
        render.showSuperchat(gift.uname, gift.price, gift.message);
      }
    }
    setTimeout(giftProcessorStart, config.display_time * 1000);
  }

  // load config from local

  let style_config = {
    font_family: "Arial",
    font_size: 30,
    text_color: "#ffffff",
    keytext_color: "#ffffff",
    text_stroke_enabled: false,
    text_stroke_color: "#000000",
  };

  // load style config from local
  const localStyle = localStorage.getItem("style_config");
  if (localStyle) {
    console.log("load style config from local");
    Object.assign(style_config, JSON.parse(localStyle));
  }

  const fontQuery = "queryLocalFonts" in window;
  let localFonts = [
    {
      name: style_config.font_family,
      value: style_config.font_family,
    },
  ];
  function getFontList() {
    if (fontQuery) {
      // @ts-ignore
      window.queryLocalFonts().then((localfs) => {
        let tmpFonts = localfs.map((/** @type {{ family: any; }} */ f) => {
          return f.family;
        });
        // remove redundant fonts
        localFonts = Array.from(new Set(tmpFonts)).map((f) => {
          return {
            name: f,
            value: f,
          };
        });
      });
    }
  }

  function configChange() {
    localStorage.setItem("config", JSON.stringify(config));
  }

  function cssChange() {
    localStorage.setItem("style_config", JSON.stringify(style_config));
  }

  function copyLink() {
    let link = window.location.href;
    link = link.split("?")[0];
    link += `?display_time=${config.display_time}`;
    link += `&show_free=${config.show_free ? 1 : 0}`;
    link += `&Code=${Code}&Caller=${Caller}&Mid=${Mid}&Timestamp=${Timestamp}&CodeSign=${CodeSign}`;
    link += "&plug_env=0";
    navigator.clipboard.writeText(link);
  }

  function copyCss() {
    const css = `
main {
  --opacity: ${style_config.opacity}!important;
  --font-size: ${style_config.font_size}px!important;
  --font-family: ${style_config.font_family}!important;
  --text-color: ${style_config.text_color}!important;
  --keytext-color: ${style_config.keytext_color}!important;
  --text-stroke-color: ${style_config.text_stroke_enabled ? style_config.text_stroke_color : "#0000"}!important;
  background-color: rgba(0, 0, 0, 0);
  margin: 0px auto;
  overflow: hidden;
}
    `;
    navigator.clipboard.writeText(css).then(
      () => {
        console.log("copy success");
      },
      (err) => {
        console.log("copy fail");
      }
    );
  }
</script>

<main>
  {#if !validLink}
    <div class="flex items-center justify-center w-full">
      <Alert>
        <span class="font-medium">签名无效！</span>
        请重新获取插件链接
      </Alert>
    </div>
  {:else}
    <div class="flex flex-col items-center justify-center w-full">
      <div
        class="main"
        class:hidden={!setted}
        style="
        --opacity: {style_config.opacity};
        --font-size: {style_config.font_size}px;
        --font-family: {style_config.font_family};
        --text-color: {style_config.text_color};
        --keytext-color: {style_config.keytext_color};
        --text-stroke-color: {style_config.text_stroke_enabled
          ? style_config.text_stroke_color
          : '#0000'};
        "
      >
        <div class="gift" class:show={show}>
          <img src={image} alt="gift icon"/>
          <div>{@html rendered_html}</div>
          <audio src={audio} id="audioplay"></audio>
        </div>
        <div class="clear">
          <Button on:click={files.clearSetting}>清除图片音频设置</Button>
        </div>
      </div>
      <div class:hidden={setted}>
        <div class="mb-4">
          <Label class="text-4xl font-bold" for="image">图片</Label>
          <Input
            type="file"
            id="image"
            accept="image/*"
            on:change={() => {
              const file = document.getElementById("image").files[0];
              files.loadImage(file);
            }}
          />
        </div>
        <div class="mb-4">
          <Label class="text-4xl font-bold" for="audio">音频</Label>
          <Input
            type="file"
            id="audio"
            accept="audio/*"
            on:change={() => {
              const file = document.getElementById("audio").files[0];
              files.loadAudio(file);
            }}
          />
        </div>
        <Button on:click={files.defaultSetting}>使用默认设置</Button>
      </div>
    </div>
    {#if plug_env}
      <Card class="h-full overflow-auto">
        <div class="mb-6">
          <Label for="counter" class="mb-2">动画时长</Label>
          <Input
            type="number"
            bind:value={config.display_time}
            on:change={configChange}
            size="sm"
            id="counter"
          />
        </div>
        <div class="mb-6">
          <Toggle
            bind:checked={config.show_free}
            on:change={configChange}
            color="red"
            size="small"
            class="mb-6">显示免费礼物</Toggle
          >
        </div>
        <div class="mb-6">
          <Label for="font_family" class="mb-2">字体</Label>
          <Input id="font_family" bind:value={style_config.font_family} on:change={cssChange} size="sm" />
        </div>
        <div class="mb-6">
          <Label class="mb-2" for="opacity">透明度</Label>
          <Range
            bind:value={style_config.opacity}
            on:change={cssChange}
            min="0"
            max="1"
            step="0.01"
            id="opacity"
          />
        </div>
        <div class="mb-6">
          <Label class="mb-2" for="font_size">文字大小</Label>
          <div class="flex items-center mb-6">
            <Input
              type="number"
              bind:value={style_config.font_size}
              on:change={cssChange}
              size="sm"
              id="font_size"
            />
          </div>
          <Toggle
            bind:checked={style_config.text_stroke_enabled}
            on:change={cssChange}
            color="red"
            size="small"
            class="mb-6">描边效果</Toggle
          >
          <div class="flex mb-6">
            <div>
              <Label for="text_color">文字颜色</Label>
              <input
                type="color"
                bind:value={style_config.text_color}
                on:change={cssChange}
                id="text_color"
              />
            </div>
            <div class="ml-10">
              <Label for="keytext_color">关键字颜色</Label>
              <input
                type="color"
                bind:value={style_config.keytext_color}
                on:change={cssChange}
                id="keytext_color"
              />
            </div>
            <div class="ml-10">
              <Label for="text_stroke_color">描边颜色</Label>
              <input
                type="color"
                bind:value={style_config.text_stroke_color}
                on:change={cssChange}
                id="text_stroke_color"
              />
            </div>
          </div>
          <ButtonGroup>
            <Button color="primary" on:click={copyLink} size="sm">复制链接</Button
            >
            <Button color="primary" on:click={copyCss} size="sm">复制 CSS</Button>
          </ButtonGroup>
        </div></Card
      >
    {/if}
  {/if}
</main>

<style>
  main {
    height: 100vh;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
  }

  .main {
    font-size: var(--font-size);
    font-family: var(--font-family);
    color: var(--text-color);
    text-shadow:
      var(--text-stroke-color, white) 1px 0 0,
      var(--text-stroke-color, white) 0 1px 0,
      var(--text-stroke-color, white) 0 -1px 0,
      var(--text-stroke-color, white) -1px 0 0;
    opacity: var(--opacity);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hidden {
    display: none;
  }

  .clear {
    display: none;
  }

  .main:hover .clear {
    display: block;
  }

  .gift {
    opacity: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: all 0.3s;
  }

  .gift.show {
    opacity: 1;
  }

</style>
