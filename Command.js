const config = require('./config.json');
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const FileTools = require('fs');
const rest = new REST({ version: '10' }).setToken(config.token);

(
  () => {
      try {
          let Commands = [], Commands_File = [];
          const Commands_Directory = './Commands';

          console.log('Commands Register Start...');

          FileTools.readdir(Commands_Directory,async (Error, Files) => {
            if (Error) {
              console.error('System Error:', Error);
              return;
            }
          
            console.log('Commands List : ');
            for(i=0;i<Files.length;i++){
              Commands_File[i] = Commands_Directory + '/' + Files[i];
            }

            for(i=0;i<Commands_File.length;i++){
              Commands.push(JSON.parse(Read_File(Commands_File[i])));
              console.log(i + ' : ' + Commands[i].name);
            }

            await rest.put(Routes.applicationCommands(config.client_id), { body: Commands });

            console.log("Commands Register Complete!");
            require('./Main.js');
          });
      } catch (error) {
          console.error(error);
      }
  }
)();


function Read_File(File_Name){
  if(File_Name){
    const File_Data = FileTools.readFileSync(File_Name, 'utf8');
    return File_Data;
  }
  else
    return false;
}