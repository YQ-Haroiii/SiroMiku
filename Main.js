//導入模組
const {
    Client, 
    GatewayIntentBits,
    PermissionsBitField,
    ActivityType, 
    Events,
    Partials
} = require('discord.js'); //discord.js
const FileSystem = require('fs'); //fs

//導入機器人config.json
const config = require('./config.json'); //config.json

//宣告用戶端權限，基礎為全部
const client = new Client({
    intents: [
        3276799,
    ],
    partials: [
        Partials.Message, 
        Partials.Channel, 
        Partials.Reaction
    ],
});

//設定訊息移除時間
const earse_message_time = 5000;

//設定管理員可以使用的指令
let Admin_Command = [
    "setrole",
    "removerole",
    "deleterole",
    "getrole",
    "reloadrole",
    "newjoin",
    "removejoin",
    "setauth",
    "removeauth"
]

//設定訊息反應資料庫
let Reaction_Database = {};

//設定加入身分組
let New_Join_Database = {};

//設定訊息身分組資料庫
let Message_Auth_Database = {};

//監聽事件
client.on('ready', () => {
    //清空控制台
    console.clear();

    //初始化資料庫資訊
    Reaction_Database = Reaction_Database_System.Load(); //讀取反應資料庫
    New_Join_Database = New_Join_System.Load(); //讀取加入身分組
    Message_Auth_Database = Message_Auth_System.Load(); //讀取訊息驗證身分組

    //顯示訊息
    console.log('Haroiii Bot Ready!');
    console.log('Build With Discord.js');
    console.log('Bot Name: ' + client.user.username);
    console.log('Bot ID: ' + client.user.id);
    console.log('invite: https://discord.com/api/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot');
}); //機器人登入

//監聽指令
client.on('interactionCreate', async interaction => {
    if(!interaction.isCommand() || interaction.user.bot) return;
    
    //設定表符身分組於訊息
    if(interaction.commandName === 'setrole' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;

        //拆解指令參數
        const message_id = interaction.options.get('message_id').value;
        const emoji = interaction.options.get('emoji').value;
        const role = interaction.options.get('role').value;

        //組合使用者輸入的參數，輸出完整的伺服器參數，用於除錯
        const Debug_message = 
            "guild_id: " + guild_id + "\n" +
            "user_id: " + user_id + "\n" +
            "message_id: " + message_id + "\n" + 
            "emoji_id: " + emoji + "\n" + 
            "role: " + role;

        //檢查有沒有該頻道
        const Command_Channel = client.channels.cache.get(interaction.channelId);
        let Command_Message;
        try{
            Command_Message = await Command_Channel.messages.fetch(message_id);
        }
        catch (error){ //判斷頻道不存在，例如要設定的訊息不再該頻道，通常會出錯
            interaction.reply('你是不是走錯地方了，我在這裡看不到那個訊息...');
            return;
        }

        //設定旗標，判斷是否有相同的表情符號
        let detect_Reaction = false;

        //檢查該訊息是否有設定該表符
        Command_Message.reactions.cache.forEach(async(reaction) => {
            //包含反應?
            if(reaction._emoji.name == emoji)
                detect_Reaction = true;
        });

        //檢查資料庫是否有該符號反應
        //如果存在伺服器資訊
        if(Reaction_Database[guild_id] != undefined){
            //縮小陣列範圍，簡化至單個伺服器內訊息資訊
            const guild_message = Reaction_Database[guild_id];
            //如果存在訊息資訊
            if(guild_message[message_id] != undefined){
                //取得訊息長度
                const message_length = guild_message[message_id].length;
                //偵測訊息
                for(i = 0;i < message_length;i++){
                    //包含反應?
                    if(guild_message[message_id][i].emoji == emoji || guild_message[message_id][i].role == role){
                        detect_Reaction = true;
                    }
                }
            }
        }

        //判斷符號存在，結束指令
        if(detect_Reaction == true){
            interaction.reply('訊息和資料庫已經有這項反應了...');
            return;
        }

        //符號不存在
        //如果沒有伺服器資訊，則建立
        if(Reaction_Database[guild_id] == undefined){
            Reaction_Database[guild_id] = {};
        }

        //如果沒有訊息資訊，則建立
        if(Reaction_Database[guild_id][message_id] == undefined){
            Reaction_Database[guild_id][message_id] = [];
        }

        //設定反應標籤ID
        let tag_id = 1;

        //查看是否曾經有該訊息已經設定，判斷標籤ID用，沒有的話就跳過
        if(Reaction_Database[guild_id][message_id] != undefined && Reaction_Database[guild_id][message_id].length > 0){
            for(i = 0;i < Reaction_Database[guild_id][message_id].length;i++){
                //如果目前的標籤小於目前比對的標籤，則將其設定為比比較標籤大
                if(Reaction_Database[guild_id][message_id][i].tag_id >= tag_id){
                    tag_id = Reaction_Database[guild_id][message_id][i].tag_id + 1;
                }
            }
        }

        //將反應資訊新增至資料庫
        Reaction_Database[guild_id][message_id].push({
            emoji: emoji,
            role: role,
            tag_id: tag_id
        });

        //寫入檔案
        Reaction_Database_System.Save();

        //新增反應，並回覆
        Command_Message.react(emoji);
        interaction.reply("反應已經新增了，我把它的標籤設定為 " + tag_id + " 了...");

        return;
    }

    //移除單個反應
    if(interaction.commandName === 'removerole' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;

        //拆解指令參數
        const message_id = interaction.options.get('message_id').value;
        const tag_id = interaction.options.get('tag_id').value;

        //組合使用者輸入的參數，輸出完整的伺服器參數，用於除錯
        const Debug_message = 
            "guild_id: " + guild_id + "\n" +
            "user_id: " + user_id + "\n" +
            "message_id: " + message_id + "\n" + 
            "tag_id: " + tag_id;

        //檢查有沒有該頻道
        const Command_Channel = client.channels.cache.get(interaction.channelId);
        let Command_Message;
        try{
            Command_Message = await Command_Channel.messages.fetch(message_id);
        }
        catch (error){ //判斷頻道不存在，例如要設定的訊息不再該頻道，通常會出錯
            interaction.reply('你是不是走錯地方了，我在這裡看不到那個訊息...');
            return;
        }

        //如果沒有伺服器資訊
        if(Reaction_Database[guild_id] == undefined){
            interaction.reply('這個訊息沒有設定過反應...');
            return;
        }

        //如果沒有頻道資訊
        if(Reaction_Database[guild_id][message_id] == undefined){
            interaction.reply('這個訊息沒有設定過反應...');
            return;
        }

        //設定尋找旗標
        let detect_Reaction = false;

        //如果存在資料，取得資料庫資訊
        for(i = 0;i < Reaction_Database[guild_id][message_id].length;i++){
            //找到符合的標籤
            if(Reaction_Database[guild_id][message_id][i].tag_id == tag_id){
                //修改尋找旗標
                detect_Reaction = true;
                //取得反應表符
                const emoji = Reaction_Database[guild_id][message_id][i].emoji;
                //檢查該訊息是否有設定該表符
                Command_Message.reactions.cache.forEach(async(reaction) => {
                    //包含反應?
                    if(reaction._emoji.name == emoji){
                        //刪除反應
                        Command_Message.reactions.cache.get(emoji).remove();
                    }
                });

                //將訊息反應資訊移除
                Reaction_Database[guild_id][message_id][i] = undefined;
            }
        }

        //如果沒有找到符合的標籤
        if(!detect_Reaction){
            interaction.reply('這個訊息沒有設定過反應...');
            return;
        }

        //製作一個訊息反應暫存
        let Reaction_Database_Message_Cache = [];

        //移除undefined訊息反應
        for(i = 0;i < Reaction_Database[guild_id][message_id].length;i++){
            //如果訊息非undefined
            if(Reaction_Database[guild_id][message_id][i] != undefined){
                //推入暫存
                Reaction_Database_Message_Cache.push(Reaction_Database[guild_id][message_id][i]);
            }
        }

        //替換原本的訊息反應
        Reaction_Database[guild_id][message_id] = Reaction_Database_Message_Cache;

        //將反應資料寫入檔案
        Reaction_Database_System.Save();

        //回覆訊息
        interaction.reply('我已經將反應刪除了...');

        return;
    }

    //移除所有訊息反應
    if(interaction.commandName === 'deleterole' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;

        //拆解指令參數
        const message_id = interaction.options.get('message_id').value;

        //檢查有沒有該頻道
        const Command_Channel = client.channels.cache.get(interaction.channelId);
        let Command_Message;
        try{
            Command_Message = await Command_Channel.messages.fetch(message_id);
        }
        catch (error){ //判斷頻道不存在，例如要設定的訊息不再該頻道，通常會出錯
            interaction.reply('你是不是走錯地方了，我在這裡看不到那個訊息...');
            return;
        }

        //如果沒有伺服器資訊
        if(Reaction_Database[guild_id] == undefined){
            interaction.reply('這個訊息沒有設定過反應...');
            return;
        }

        //如果沒有頻道資訊
        if(Reaction_Database[guild_id][message_id] == undefined){
            interaction.reply('這個訊息沒有設定過反應...');
            return;
        }

        //設定空陣列指標
        let isNull = false;

        //檢查是否為空陣列
        if(Reaction_Database[guild_id][message_id].length == 0)
            isNull = true;  //空陣列

        //移除所有訊息反應
        Reaction_Database[guild_id][message_id] = undefined;
        Command_Message.reactions.removeAll();

        //製作一個訊頻道暫存
        let Reaction_Database_Guild_Cache = {};

        //取得資料庫中頻道所有ID
        const Reaction_Database_Guild_Cache_Name = Object.keys(Reaction_Database[guild_id]);

        //移除undefined頻道反應
        for(i = 0;i < Reaction_Database_Guild_Cache_Name.length;i++){
            //如果頻道非undefined
            if(Reaction_Database[guild_id][Reaction_Database_Guild_Cache_Name[i]] != undefined){
                //推入暫存
                Reaction_Database_Guild_Cache[Reaction_Database_Guild_Cache_Name[i]] = Reaction_Database[guild_id][Reaction_Database_Guild_Cache_Name[i]];
            }
        }

        //替換原本的伺服器資料
        Reaction_Database[guild_id] = Reaction_Database_Guild_Cache;

        //將反應資料寫入檔案
        Reaction_Database_System.Save();

        //回覆訊息
        if(isNull == true)
            interaction.reply('這個訊息沒有設定過反應...');
        else
            interaction.reply('我已經將這個訊息的反應刪除了...');

        return;
    }

    //查看訊息反應
    if(interaction.commandName === 'getrole' && Check_Admin(interaction)){
        //常駐回應，不刪除

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;

        //拆解指令參數
        const message_id = interaction.options.get('message_id').value;

        //檢查有沒有該頻道
        const Command_Channel = client.channels.cache.get(interaction.channelId);
        let Command_Message;
        try{
            Command_Message = await Command_Channel.messages.fetch(message_id);
        }
        catch (error){ //判斷頻道不存在，例如要設定的訊息不再該頻道，通常會出錯
            interaction.reply({
                content: '你是不是走錯地方了，我在這裡看不到那個訊息...',
                ephemeral: true
            });
            return;
        }

        //如果沒有伺服器資訊
        if(Reaction_Database[guild_id] == undefined){
            interaction.reply({
                content: '這個訊息沒有設定過反應...',
                ephemeral: true   
            });
            return;
        }

        //如果沒有頻道資訊
        if(Reaction_Database[guild_id][message_id] == undefined){
            interaction.reply({
                content: '這個訊息沒有設定過反應...',
                ephemeral: true   
            });
            return;
        }

        //取得訊息所有反應
        const Reaction_Database_Message = Reaction_Database[guild_id][message_id];

        //建立回應表
        let Reply = "";

        //開頭
        Reply += "你要的反應資訊在這裡...\n";

        //訊息資訊
        Reply += "訊息 ID：" + message_id + "\n\n";

        //填入訊息所有反應
        for(i = 0;i < Reaction_Database_Message.length;i++){
            Reply += "> 反應符號 : " + Reaction_Database_Message[i].emoji + "\n";
            Reply += "> 反應身分組 : " + Reaction_Database_Message[i].role + "\n";
            Reply += "> 反應標籤 ID : " + Reaction_Database_Message[i].tag_id + "\n\n";
        }

        //回覆訊息，只有使用者可以看到
        interaction.reply({
            content: Reply,
            ephemeral: true
        });
    }

    //重新加載反應
    if(interaction.commandName === 'reloadrole' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;

        //拆解指令參數
        const message_id = interaction.options.get('message_id').value;

        //檢查有沒有該頻道
        const Command_Channel = client.channels.cache.get(interaction.channelId);
        let Command_Message;
        try{
            Command_Message = await Command_Channel.messages.fetch(message_id);
        }
        catch (error){ //判斷頻道不存在，例如要設定的訊息不再該頻道，通常會出錯
            interaction.reply('你是不是走錯地方了，我在這裡看不到那個訊息...');
            return;
        }

        //如果沒有伺服器資訊
        if(Reaction_Database[guild_id] == undefined){
            interaction.reply('這個訊息沒有設定過反應...');
            return;
        }

        //如果沒有頻道資訊
        if(Reaction_Database[guild_id][message_id] == undefined){
            interaction.reply('這個訊息沒有設定過反應...');
            return;
        }

        //載入頻道訊息
        const Reaction_Database_Message = Reaction_Database[guild_id][message_id];

        //新增訊息反應
        for(i = 0 ; i < Reaction_Database_Message.length ; i++){
            Command_Message.react(Reaction_Database_Message[i].emoji);
        }

        //回覆訊息
        interaction.reply('我已經將訊息反應更新了...');
    }

    //設定新加入成員身分組
    if(interaction.commandName === 'newjoin' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;

        //拆解指令參數
        const role_id = interaction.options.get('role').value;

        //檢查該群組是否存在
        if(New_Join_Database[guild_id] == undefined){
            New_Join_Database[guild_id] = [];
        }

        //檢查該身分組是否已經設定過
        if(New_Join_Database[guild_id].includes(role_id)){
            interaction.reply('這個身分組已經設定過了...');
            return;
        }

        //新增身分組
        New_Join_Database[guild_id].push(role_id);

        //儲存資料
        New_Join_System.Save();

        //回覆訊息
        interaction.reply('我已經將身分組設定完成了...');

        return;
    }

    //移除新加入成員身分組
    if(interaction.commandName === 'removejoin' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;

        //拆解指令參數
        const role_id = interaction.options.get('role').value;

        //檢查該群組是否存在
        if(New_Join_Database[guild_id] == undefined){
            New_Join_Database[guild_id] = [];
        }

        //檢查該身分組是否已經設定過
        if(!New_Join_Database[guild_id].includes(role_id)){
            interaction.reply('這個身分組沒有設定過...');
            return;
        }

        //移除身分組
        for(i = 0;i < New_Join_Database[guild_id].length;i++){
            if(New_Join_Database[guild_id][i] == role_id){
                New_Join_Database[guild_id][i] = undefined;
                break;
            }
        }

        //建立身分組暫存
        const New_Join_Database_Cache = [];

        //移除空白值
        for(i = 0;i < New_Join_Database[guild_id].length;i++){
            if(New_Join_Database[guild_id][i] != undefined){
                New_Join_Database_Cache.push(New_Join_Database[guild_id][i]);
            }
        }

        //替換原本資料
        New_Join_Database[guild_id] = New_Join_Database_Cache;

        //儲存資料
        New_Join_System.Save();

        //回覆訊息
        interaction.reply('我已經將身分組移除完成了...');

        return;
    }

    //設定認證訊息
    if(interaction.commandName === 'setauth' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //基礎資料
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;
        const channel_id = interaction.channelId;

        //拆解指令參數
        const message = interaction.options.get('message').value;
        const role = interaction.options.get('role').value;

        //設定旗標，判斷是否有相同的認證訊息
        let detect_Reaction = false;

        //檢查伺服器是否有資料
        if(Message_Auth_Database[guild_id] != undefined){
            //檢查頻道是否有資料
            if(Message_Auth_Database[guild_id][channel_id] != undefined){
                //判斷有沒有訊息
                if(Message_Auth_Database[guild_id][channel_id].length != 0){
                    //掃描訊息
                    for(i = 0;i < Message_Auth_Database[guild_id][channel_id].length;i++){
                        //檢查資料庫是否有相同的訊息
                        if(Message_Auth_Database[guild_id][channel_id][i].message === message){
                            detect_Reaction = true;
                        }
                    }
                }
            }
        }

        //如果有相同的訊息
        if(detect_Reaction){
            interaction.reply('這個訊息已經設定過了...');
            return;
        }

        //如果伺服器沒有資料
        if(Message_Auth_Database[guild_id] == undefined){
            Message_Auth_Database[guild_id] = {};
        }

        //如果頻道沒有資料
        if(Message_Auth_Database[guild_id][channel_id] == undefined){
            Message_Auth_Database[guild_id][channel_id] = [];
        }

        //新增資料
        Message_Auth_Database[guild_id][channel_id].push({
            message: message,
            role: role
        })

        //寫入檔案
        Message_Auth_System.Save();

        //回覆
        interaction.reply("我已經將認證訊息設定好了...");

        return;
    }

    //移除認證訊息
    if(interaction.commandName === 'removeauth' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //基礎資料
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;
        const channel_id = interaction.channelId;

        //拆解指令參數
        const message = interaction.options.get('message').value;

        //沒有認證訊息
        if(Message_Auth_Database[guild_id] == undefined){
            interaction.reply('我沒有這個認證的訊息...');
            return;
        }

        //沒有認證訊息
        if(Message_Auth_Database[guild_id][channel_id] == undefined){
            interaction.reply('我沒有這個認證的訊息...');
            return;
        }

        //檢查伺服器是否有資料
        if(Message_Auth_Database[guild_id] != undefined){
            //檢查頻道是否有資料
            if(Message_Auth_Database[guild_id][channel_id] != undefined){
                //判斷有沒有訊息
                if(Message_Auth_Database[guild_id][channel_id].length > 0){
                    //掃描訊息
                    for(i = 0;i < Message_Auth_Database[guild_id][channel_id].length;i++){
                        //檢查資料庫是否有相同的訊息，有的話則移除
                        if(Message_Auth_Database[guild_id][channel_id][i].message == message){
                            Message_Auth_Database[guild_id][channel_id][i] = undefined;
                        }
                    }
                }
            }
        }

        //建立認證訊息暫存
        let Message_Auth_Database_Cache = [];

        //將非defined資料存入
        for(i = 0;i < Message_Auth_Database[guild_id][channel_id].length;i++){
            if(Message_Auth_Database[guild_id][channel_id][i] != undefined){
                Message_Auth_Database_Cache.push(Message_Auth_Database[guild_id][channel_id][i]);
            }
        }

        //更新資料
        Message_Auth_Database[guild_id][channel_id] = Message_Auth_Database_Cache;

        //寫入檔案
        Message_Auth_System.Save();

        //回覆
        interaction.reply("我已經將認證訊息移除了...");

        return;
    }

    //移除全部認證訊息
    if(interaction.commandName === 'deleteauth' && Check_Admin(interaction)){
        //提前指定移除指令訊息，讓此通知設為提醒功能
        setTimeout(()=>{
            interaction.deleteReply();
        },earse_message_time);

        //基礎資料
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;
        const channel_id = interaction.channelId;

        //沒有認證訊息
        if(Message_Auth_Database[guild_id] == undefined){
            console.log("thisA");
            interaction.reply('這個頻道沒有任何認證訊息...');
            return;
        }

        //沒有認證訊息
        if(Message_Auth_Database[guild_id][channel_id] == undefined){
            interaction.reply('這個頻道沒有任何認證訊息...');
            return;
        }

        //檢查伺服器是否有資料
        if(Message_Auth_Database[guild_id] != undefined){
            //檢查頻道是否有資料
            if(Message_Auth_Database[guild_id][channel_id] != undefined){
                //判斷有沒有訊息
                if(Message_Auth_Database[guild_id][channel_id].length > 0){
                    //移除全部訊息
                    Message_Auth_Database[guild_id][channel_id] = undefined;
                }
            }
        }

        //建立認證頻道暫存
        let Message_Auth_Database_Cache = {};

        //取得所有頻道名稱
        const Message_Auth_Database_Channels = Object.keys(Message_Auth_Database[guild_id]);

        //將非defined資料存入
        for(i = 0;i < Message_Auth_Database_Channels.length;i++){
            //如果有資料
            if(Message_Auth_Database[guild_id][Message_Auth_Database_Channels[i]] != undefined){
                //放入認證訊息暫存
                Message_Auth_Database_Cache[Message_Auth_Database_Channels[i]] = Message_Auth_Database[guild_id][Message_Auth_Database_Channels[i]];
            }
        }

        //更新資料
        Message_Auth_Database[guild_id] = Message_Auth_Database_Cache;

        //寫入檔案
        Message_Auth_System.Save();

        //回覆
        interaction.reply("我已經將認證訊息全部刪除了...");

        return;
    }

    //查看認證訊息
    if(interaction.commandName === 'getauth' && Check_Admin(interaction)){
        //常駐回應，不刪除

        //伺服器參數
        const guild_id = interaction.guildId;
        const user_id = interaction.user.id;
        const channel_id = interaction.channelId;

        //沒有認證訊息
        if(Message_Auth_Database[guild_id] == undefined){
            interaction.reply({
                content: '這個頻道沒有任何認證訊息...',
                ephemeral: true
            });
            return;
        }

        //沒有認證訊息
        if(Message_Auth_Database[guild_id][channel_id] == undefined){
            interaction.reply({
                content: '這個頻道沒有任何認證訊息...',
                ephemeral: true
            });
            return;
        }

        //取得伺服器全部頻道
        const guildinfo = Message_Auth_Database[guild_id];
        
        //取得當前的頻道資訊
        const guildchannel = guildinfo[channel_id];

        //如果長度為0，表示沒有資料
        if(guildchannel.length == 0){
            interaction.reply({
                content: '這個頻道沒有任何認證訊息...',
                ephemeral: true
            });
            return;
        }

        //建立回應表
        let Reply = "";

        //開頭
        Reply += "你要的反應資訊在這裡...\n";

        //訊息資訊
        Reply += "頻道 ID：" + channel_id + "\n\n";

        //列出全部資訊
        for(i = 0;i < guildchannel.length;i++){
             Reply += "> 認證訊息 : " + guildchannel[i].message + "\n";
             Reply += "> 認證身分組 : " + guildchannel[i].role + "\n\n";
        }

        //回覆訊息，只有使用者可以看到
        interaction.reply({
            content: Reply,
            ephemeral: true
        });
    }

    //如果非管理員使用管理員指令
    for(i = 0;i < Admin_Command.length;i++){
        if(interaction.commandName == Admin_Command[i] && !Check_Admin(interaction)){
            interaction.reply({
                content: '你沒有權限使用此指令...',
                ephemeral: true
            });
            return;
        }
    }
})

//反應新增
client.on('messageReactionAdd', async (interaction, user) => {
    //取得基礎資料
    const guild_id = interaction.message.guildId;
    const channel_id = interaction.message.channelId;
    const message_id = interaction.message.id;
    const user_id = user.id;

    //取得觸發的反應
    const emoji = interaction.emoji.name;

    //取得伺服器的所有訊息資訊
    const guild_message = Reaction_Database[guild_id];

    //如果資料庫存在該伺服器
    if(guild_message != undefined){
        //如果資料庫存在該訊息
        if(guild_message[message_id] != undefined){
            //設定身分組旗標
            let role_Cache = '0';

            //掃描使用者選取反應的身分組
            for(i = 0 ; i < guild_message[message_id].length ; i++){
                if(emoji == guild_message[message_id][i].emoji){
                    role_Cache = guild_message[message_id][i].role;
                }
            }

            //如果旗標有資料(不為 0)
            if(role_Cache != '0'){
                //將使用者加入身分組
                await interaction.message.guild.members.cache.get(user_id).roles.add(role_Cache);
            }
        }

        //發送訊息，提醒使用者已經加入身分組，通常不開，要不然會擾民
        //client.channels.get(channel_id).send('<@' + user_id + '> 我已經幫你加入身分組了...');
    }
})

//反應移除
client.on('messageReactionRemove', async (interaction, user) => {
    //取得基礎資料
    const guild_id = interaction.message.guildId;
    const channel_id = interaction.message.channelId;
    const message_id = interaction.message.id;
    const user_id = user.id;

    //取得觸發的反應
    const emoji = interaction.emoji.name;

    //取得伺服器的所有訊息資訊
    const guild_message = Reaction_Database[guild_id];

    //如果資料庫存在該伺服器
    if(guild_message != undefined){
        //如果資料庫存在該訊息
        if(guild_message[message_id] != undefined){
            //設定身分組旗標
            let role_Cache = '0';

            //掃描使用者選取反應的身分組
            for(i = 0 ; i < guild_message[message_id].length ; i++){
                if(emoji == guild_message[message_id][i].emoji){
                    role_Cache = guild_message[message_id][i].role;
                }
            }

            //如果旗標有資料(不為 0)
            if(role_Cache != '0'){
                //將使用者移出身分組
                await interaction.message.guild.members.cache.get(user_id).roles.remove(role_Cache);
            }
        }

        //發送訊息，提醒使用者已經加入身分組，通常不開，要不然會擾民
        //client.channels.get(channel_id).send('<@' + user_id + '> 我已經幫你移除身分組了...');
    }
})

//成員加入
client.on('guildMemberAdd', async (member) => {
    //取得基礎資料
    const guild_id = member.guild.id;

    //檢查是否有加入預設身分組
    if(New_Join_Database[guild_id] != undefined){
        //將使用者加入身分組
        for(i = 0 ; i < New_Join_Database[guild_id].length ; i++){
            member.roles.add(New_Join_Database[guild_id][i]);
        }
    }
})

//成員訊息
client.on('messageCreate', async message => {
    //取得基礎資料
    const guild_id = message.guildId;

    //檢查該伺服器是否有資料
    if(Message_Auth_Database[guild_id] != undefined){
        //檢查該頻道是否有資料
        if(Message_Auth_Database[guild_id][message.channelId] != undefined){
            //掃描訊息資料庫
            for(i = 0 ; i < Message_Auth_Database[guild_id][message.channelId].length ; i++){
                //如果訊息有匹配
                if(message.content === Message_Auth_Database[guild_id][message.channelId][i].message){
                    //將使用者加入身分組
                    message.member.roles.add(Message_Auth_Database[guild_id][message.channelId][i].role);

                    //移除使用者的訊息
                    message.delete();
                }
            }
        }
    }
})

//管理員權限偵測
function Check_Admin(interaction){
    //取得管理員權限
    const admin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    //如果沒有管理員權限
    if(admin == false){
        return false;
    }

    //如果有管理員權限
    return true;
}

//反應資料
const Reaction_Database_System = {
    //檔案位置
    File_name: './Data/reaction_role.json',

    //讀取資料
    Load: function(){
        //判斷檔案是否存在
        if(FileSystem.existsSync(this.File_name) == false){
            //創建檔案
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }
    
        //讀取JSON檔案
        const Cache_File = FileSystem.readFileSync(this.File_name, 'utf8');
    
        //如果是空字串
        if(Cache_File == ''){
            //建立字串
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }
    
        //將JSON寫入變數
        return JSON.parse(FileSystem.readFileSync(this.File_name, 'utf8'));
    },

    //儲存資料
    Save: function(){
        //將加入身分組資料寫入檔案
        FileSystem.writeFileSync(this.File_name, JSON.stringify(Reaction_Database));
    }
}

//加入身分組資料
const New_Join_System = {
    //檔案位置
    File_name: './Data/join_role.json',

    //讀取資料
    Load: function(){
        //判斷檔案是否存在
        if(FileSystem.existsSync(this.File_name) == false){
            //創建檔案
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }
    
        //讀取JSON檔案
        const Cache_File = FileSystem.readFileSync(this.File_name, 'utf8');
    
        //如果是空字串
        if(Cache_File == ''){
            //建立字串
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }
    
        //將JSON寫入變數
        return JSON.parse(FileSystem.readFileSync(this.File_name, 'utf8'));
    },

    //儲存資料
    Save: function(){
        //將加入身分組資料寫入檔案
        FileSystem.writeFileSync(this.File_name, JSON.stringify(New_Join_Database));
    }
}

//訊息驗證身分組資料
const Message_Auth_System = {
    //檔案位置
    File_name: './Data/message_auth_role.json',

    //讀取資料
    Load: function(){
        //判斷檔案是否存在
        if(FileSystem.existsSync(this.File_name) == false){
            //創建檔案
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }
    
        //讀取JSON檔案
        const Cache_File = FileSystem.readFileSync(this.File_name, 'utf8');
    
        //如果是空字串
        if(Cache_File == ''){
            //建立字串
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }
    
        //將JSON寫入變數
        return JSON.parse(FileSystem.readFileSync(this.File_name, 'utf8'));
    },

    //儲存資料
    Save: function(){
        //將加入身分組資料寫入檔案
        FileSystem.writeFileSync(this.File_name, JSON.stringify(Message_Auth_Database));
    }
}

//機器人登入
client.login(config.token);