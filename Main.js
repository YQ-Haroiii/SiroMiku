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
    "reloadrole"
]

//設定訊息反應資料庫
let Reaction_Database = {};

//監聽事件
client.on('ready', () => {
    //清空控制台
    console.clear();

    //初始化資料庫資訊
    Reaction_Database_System.Load(); //讀取反應資料庫

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
    if (interaction.commandName === 'setrole' && Check_Admin(interaction)){
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
        FileSystem.writeFileSync('./Data/message_role.json', JSON.stringify(Reaction_Database));

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

    //如果非管理員使用管理員指令
    for(i = 0;i < Admin_Command_List.length;i++){
        if(interaction.commandName == Admin_Command_List[i] && !Check_Admin(interaction)){
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



let Reaction_Database_System = {
    //反應資料檔案位置
    File_name: './Data/message_role.json',

    //讀取反應資料
    Load: function(){
        //判斷檔案是否存在
        if(FileSystem.existsSync(this.File_name) == false){
            //創建檔案
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }

        //讀取JSON檔案
        const Cache_Reaction_Database = FileSystem.readFileSync(this.File_name, 'utf8');

        //如果是空字串
        if(Cache_Reaction_Database == ''){
            //建立字串
            FileSystem.writeFileSync(this.File_name, JSON.stringify({}));
        }

        //將JSON寫入變數
        Reaction_Database = JSON.parse(FileSystem.readFileSync(this.File_name, 'utf8'));
    },

    //儲存反應資料
    Save: function(){
        //將反應資料寫入檔案
        FileSystem.writeFileSync(this.File_name, JSON.stringify(Reaction_Database));
    }
}

//機器人登入
client.login(config.token);