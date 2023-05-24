import { Client, Interaction, CommandInteraction, SlashCommandBuilder, REST, Routes, GatewayIntentBits, EmbedBuilder, TextBasedChannel } from "discord.js";
import ExcelJS from "exceljs";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import XLSX from "xlsx";

const { token, onlySword, vanilla, pot, netheritePot, axe, uhc, smp, applicationID } = require("../config.json");

interface UrlArray {
    [index: number] : string;
}

interface sheetData {
    sheetName: string | number;
    data: unknown[]
}

interface playerData {
    region: string
    tier: number
}

const urlList: UrlArray = [onlySword, vanilla, pot, netheritePot, axe, uhc, smp];

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});
const rest = new REST({version: '10'}).setToken(token);

async function getData(url: string) {
    
    const options: AxiosRequestConfig = ({ 
        url,
        responseType: "arraybuffer"
    }) 

    let axiosResponse = await axios(options);
    const workbook = XLSX.read(axiosResponse.data);

    let worksheets: sheetData[] = workbook.SheetNames.map((sheetName: string | number) => {
        return { sheetName: sheetName, data: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) };
    });
    console.log(worksheets[0].sheetName);

    return worksheets;
}

const commands = [
    new SlashCommandBuilder().setName("tier")
    // .addStringOption( option =>
    //     option.setName("category").setDescription("pvp category").setRequired(true).addChoices(
    //         {name: "OnlySword", value: "0"},
    //         {name: "Vanilla", value: "1"},
    //         {name: "Pot", value: "2"},
    //         {name: "NetheritePot", value: "3"},
    //         {name: "Axe", value: "4"},
    //         {name: "UHC", value: "5"},
    //         {name: "SMP", value: "6"}
    //     )
    // )
    .addStringOption(
        option => option.setName("nickname").setDescription("player's nickname").setRequired(true)
    ).setDescription("Show player's pvp tier")
].map((command: SlashCommandBuilder) => {return command.toJSON()});

(async () => {
    await rest.put(Routes.applicationCommands(applicationID), {body: commands})
        .then(() => {
            console.log("deployed command (/tier)");
        })
        .catch((error) => {
            console.log(error.message+"\n[PVP TIER LIST] Command Error");
        })
})();

client.on("interactionCreate", async (interaction: Interaction) => {
	try {
        if (!interaction.isCommand) return;
        const ci = interaction as CommandInteraction;

        if ((ci).commandName === "tier") {
            // const category: number = Number(ci.options.get("category")?.value?.toString()!!);
            const playerID: string = ci.options.get("nickname")?.value?.toString()!!;

            let isExist: boolean = true;
            let playerUUID: string;

            const uuid = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${playerID}`).then((response) => {
                playerUUID = response.data["id"];
            }).catch((error) => {
                isExist = false;
            });

            if (!isExist) {
                ci.reply({embeds: [new EmbedBuilder().setColor("Aqua").setTitle(`Invalid nickname '${playerID}'`).setDescription(`'${playerID}' is not a valid nickname`)]});
                return;
            }

            const playerDict: {
                [name: string] : playerData
            } = {};

            const isNotUndefined = (something: any) => {
                return (typeof something) !== "undefined";
            };

            const data = (await getData(urlList[0]))[0].data as any;

            data.forEach((object: any)=> {
                if (isNotUndefined(object["B"])) playerDict[object["B"]] = { region: object["A"], tier: 1 }
                if (isNotUndefined(object["D"])) playerDict[object["D"]] = { region: object["C"], tier: 2 }
                if (isNotUndefined(object["F"])) playerDict[object["F"]] = { region: object["E"], tier: 3 }
                if (isNotUndefined(object["H"])) playerDict[object["H"]] = { region: object["G"], tier: 4 }
                if (isNotUndefined(object["J"])) playerDict[object["J"]] = { region: object["I"], tier: 5 }
            });


            if (!Object.keys(playerDict).includes(playerID)) {
                cannotFindMember(ci, playerID);
            } else {
                sendInfo(ci, playerID, playerDict[playerID], playerUUID!!);
            }
        }
        
    } catch (error) {
        console.log(error+"\n[PVP TIER LIST] Interaction error");
    }
});

client.login(token).then(() => {
    console.log("[PVP TIER LIST] Bot is ready");
});

function cannotFindMember(interaction: CommandInteraction, playerid: string) {
    interaction.reply({embeds: [new EmbedBuilder().setColor("Aqua").setTitle(`Cannot find '${playerid}' on tier list`).setDescription(`'${playerid}' doesn't exist on tier list. Please check a typing error`)]});
}
async function sendInfo(interaction: CommandInteraction, playerid: string ,data:playerData, uuid: string) {
    const { tier, region } = data;
    // let prettyCategory: string

    // switch (category) {
    //     case 0:
    //         prettyCategory = "🗡OnlySword";
    //         break;
    //     case 1:
    //         prettyCategory = "🌄Vanilla";
    //         break;
    //     case 2:
    //         prettyCategory = "🧪Pot";
    //         break;
    //     case 3:
    //         prettyCategory = "♟Netherite Pot";
    //         break;
    //     case 4:
    //         prettyCategory = "🪓Axe";
    //         break;
    //     case 5:
    //         prettyCategory = "💓UHC";
    //         break;
    //     case 6:
    //         prettyCategory = "🛡SMP";
    //         break;
    //     default:
    //         prettyCategory = "ERROR"
    // }

    interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle(playerid)
            .setColor("Aqua")
            .addFields(
                {name: "UUID", value: uuid},
                {name: "🌏REGION", value: regionFullName(region), inline: true},
                {name: "🗡TIER", value: `TIER ${tier}`, inline: true},
                // {name: "🗡PVP", value: prettyCategory, inline: true}
            ).setThumbnail(`https://cravatar.eu/helmavatar/${playerid}/64.png`)
        ]
    });
}

function regionFullName(regionName: string) : string {
    switch (regionName) {
        case "EU": return "Europe";
        case "AS": return "Asia";
        case "AF": return "Africa";
        case "NA": return "North America";
        case "SA": return "South America";
        case "AU": return "Oceania";
        case "ME": return "Middle East";
        default: return "ERROR";
    }
}