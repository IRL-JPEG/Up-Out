/* Hit regions for the supplied elevator artwork, in native 1280 x 2276 pixels.
 * Each section groups its room label and the adjacent illustrated control.
 * Unlabelled decorative controls intentionally have no target.
 */
(function (root) {
  const content = {
    "width": 1280,
    "height": 2276,
    "sections": [
      {
        "id": "chocolate-room",
        "label": "The Chocolate Room",
        "regions": [
          {
            "type": "ellipse",
            "cx": 626,
            "cy": 452,
            "rx": 173,
            "ry": 179
          }
        ],
        "focus": {
          "x": 626,
          "y": 452
        }
      },
      {
        "id": "inventing-room",
        "label": "The Inventing Room",
        "regions": [
          {
            "type": "ellipse",
            "cx": 358,
            "cy": 239,
            "rx": 86,
            "ry": 94
          }
        ],
        "focus": {
          "x": 358,
          "y": 239
        }
      },
      {
        "id": "nut-room",
        "label": "The Nut Room",
        "regions": [
          {
            "type": "ellipse",
            "cx": 753,
            "cy": 222,
            "rx": 83,
            "ry": 85
          }
        ],
        "focus": {
          "x": 753,
          "y": 222
        }
      },
      {
        "id": "television-room",
        "label": "The Television-Chocolate Room",
        "regions": [
          {
            "type": "rect",
            "x": 853,
            "y": 157,
            "width": 197,
            "height": 170,
            "rx": 39
          }
        ],
        "focus": {
          "x": 952,
          "y": 241
        }
      },
      {
        "id": "rock-candy-mine",
        "label": "Rock-candy mine, 10,000 feet deep",
        "regions": [
          {
            "type": "rect",
            "x": 235,
            "y": 350,
            "width": 160,
            "height": 103,
            "rx": 14
          },
          {
            "type": "ellipse",
            "cx": 191,
            "cy": 464,
            "rx": 49,
            "ry": 65
          }
        ],
        "focus": {
          "x": 315,
          "y": 401
        }
      },
      {
        "id": "cokernut-ice-rinks",
        "label": "Cokernut-ice skating rinks",
        "regions": [
          {
            "type": "rect",
            "x": 253,
            "y": 475,
            "width": 181,
            "height": 89,
            "rx": 15
          },
          {
            "type": "ellipse",
            "cx": 220,
            "cy": 627,
            "rx": 55,
            "ry": 64
          },
          {
            "type": "ellipse",
            "cx": 260,
            "cy": 624,
            "rx": 35,
            "ry": 41
          }
        ],
        "focus": {
          "x": 343,
          "y": 519
        }
      },
      {
        "id": "strawberry-juice-water-pistols",
        "label": "Strawberry-juice water pistols",
        "regions": [
          {
            "type": "rect",
            "x": 241,
            "y": 763,
            "width": 195,
            "height": 92,
            "rx": 16
          },
          {
            "type": "ellipse",
            "cx": 337,
            "cy": 729,
            "rx": 65,
            "ry": 60
          }
        ],
        "focus": {
          "x": 338,
          "y": 808
        }
      },
      {
        "id": "toffee-apple-trees",
        "label": "Toffee-apple trees, all sizes",
        "regions": [
          {
            "type": "rect",
            "x": 454,
            "y": 703,
            "width": 177,
            "height": 144,
            "rx": 22
          },
          {
            "type": "ellipse",
            "cx": 536,
            "cy": 702,
            "rx": 40,
            "ry": 43
          }
        ],
        "focus": {
          "x": 543,
          "y": 780
        }
      },
      {
        "id": "exploding-sweets",
        "label": "Exploding sweets for your enemies",
        "regions": [
          {
            "type": "rect",
            "x": 670,
            "y": 738,
            "width": 158,
            "height": 123,
            "rx": 18
          },
          {
            "type": "ellipse",
            "cx": 750,
            "cy": 710,
            "rx": 66,
            "ry": 58
          }
        ],
        "focus": {
          "x": 749,
          "y": 804
        }
      },
      {
        "id": "luminous-lollies",
        "label": "Luminous lollies for eating in bed",
        "regions": [
          {
            "type": "rect",
            "x": 972,
            "y": 724,
            "width": 176,
            "height": 108,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 929,
            "cy": 776,
            "rx": 57,
            "ry": 65
          }
        ],
        "focus": {
          "x": 1060,
          "y": 779
        }
      },
      {
        "id": "mint-jujubes",
        "label": "Mint jujubes for the boy next door",
        "regions": [
          {
            "type": "rect",
            "x": 242,
            "y": 904,
            "width": 136,
            "height": 107,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 205,
            "cy": 934,
            "rx": 62,
            "ry": 66
          }
        ],
        "focus": {
          "x": 310,
          "y": 956
        }
      },
      {
        "id": "cavity-filling-caramels",
        "label": "Cavity-filling caramels",
        "regions": [
          {
            "type": "rect",
            "x": 384,
            "y": 940,
            "width": 159,
            "height": 84,
            "rx": 18
          },
          {
            "type": "ellipse",
            "cx": 454,
            "cy": 906,
            "rx": 65,
            "ry": 49
          }
        ],
        "focus": {
          "x": 464,
          "y": 981
        }
      },
      {
        "id": "stickjaw",
        "label": "Stickjaw for talkative parents",
        "regions": [
          {
            "type": "rect",
            "x": 661,
            "y": 922,
            "width": 119,
            "height": 102,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 639,
            "cy": 933,
            "rx": 53,
            "ry": 63
          }
        ],
        "focus": {
          "x": 719,
          "y": 972
        }
      },
      {
        "id": "wriggle-sweets",
        "label": "Wriggle-sweets",
        "regions": [
          {
            "type": "rect",
            "x": 791,
            "y": 955,
            "width": 137,
            "height": 76,
            "rx": 18
          },
          {
            "type": "ellipse",
            "cx": 854,
            "cy": 920,
            "rx": 70,
            "ry": 61
          }
        ],
        "focus": {
          "x": 860,
          "y": 992
        }
      },
      {
        "id": "invisible-chocolate-bars",
        "label": "Invisible chocolate bars",
        "regions": [
          {
            "type": "rect",
            "x": 972,
            "y": 891,
            "width": 146,
            "height": 116,
            "rx": 21
          },
          {
            "type": "ellipse",
            "cx": 979,
            "cy": 963,
            "rx": 41,
            "ry": 41
          }
        ],
        "focus": {
          "x": 1050,
          "y": 949
        }
      },
      {
        "id": "sugar-coated-pencils",
        "label": "Sugar-coated pencils",
        "regions": [
          {
            "type": "rect",
            "x": 237,
            "y": 1080,
            "width": 162,
            "height": 81,
            "rx": 17
          },
          {
            "type": "rect",
            "x": 182,
            "y": 1033,
            "width": 199,
            "height": 62,
            "rx": 19
          }
        ],
        "focus": {
          "x": 318,
          "y": 1120
        }
      },
      {
        "id": "fizzy-lemonade-pools",
        "label": "Fizzy lemonade swimming pools",
        "regions": [
          {
            "type": "rect",
            "x": 544,
            "y": 1039,
            "width": 141,
            "height": 109,
            "rx": 19
          },
          {
            "type": "ellipse",
            "cx": 488,
            "cy": 1093,
            "rx": 61,
            "ry": 67
          }
        ],
        "focus": {
          "x": 615,
          "y": 1094
        }
      },
      {
        "id": "magic-hand-fudge",
        "label": "Magic hand-fudge",
        "regions": [
          {
            "type": "rect",
            "x": 793,
            "y": 1068,
            "width": 103,
            "height": 89,
            "rx": 18
          },
          {
            "type": "ellipse",
            "cx": 760,
            "cy": 1091,
            "rx": 60,
            "ry": 62
          }
        ],
        "focus": {
          "x": 846,
          "y": 1112
        }
      },
      {
        "id": "rainbow-drops",
        "label": "Rainbow drops",
        "regions": [
          {
            "type": "rect",
            "x": 992,
            "y": 1074,
            "width": 111,
            "height": 87,
            "rx": 19
          },
          {
            "type": "ellipse",
            "cx": 955,
            "cy": 1099,
            "rx": 58,
            "ry": 62
          }
        ],
        "focus": {
          "x": 1048,
          "y": 1116
        }
      },
      {
        "id": "storeroom-54-creams",
        "label": "Storeroom 54 — the creams",
        "regions": [
          {
            "type": "rect",
            "x": 284,
            "y": 1189,
            "width": 151,
            "height": 100,
            "rx": 18
          },
          {
            "type": "ellipse",
            "cx": 231,
            "cy": 1240,
            "rx": 67,
            "ry": 60
          }
        ],
        "focus": {
          "x": 362,
          "y": 1238
        }
      },
      {
        "id": "storeroom-71-whips",
        "label": "Storeroom 71 — the whips",
        "regions": [
          {
            "type": "rect",
            "x": 535,
            "y": 1175,
            "width": 161,
            "height": 105,
            "rx": 19
          },
          {
            "type": "ellipse",
            "cx": 490,
            "cy": 1235,
            "rx": 54,
            "ry": 62
          },
          {
            "type": "rect",
            "x": 480,
            "y": 1274,
            "width": 25,
            "height": 51,
            "rx": 10
          }
        ],
        "focus": {
          "x": 615,
          "y": 1227
        }
      },
      {
        "id": "storeroom-77-beans",
        "label": "Storeroom 77 — the beans / Has-Beans",
        "regions": [
          {
            "type": "rect",
            "x": 793,
            "y": 1183,
            "width": 143,
            "height": 92,
            "rx": 18
          },
          {
            "type": "ellipse",
            "cx": 757,
            "cy": 1240,
            "rx": 48,
            "ry": 54
          }
        ],
        "focus": {
          "x": 865,
          "y": 1229
        }
      },
      {
        "id": "marshmallow-pillows",
        "label": "Eatable marshmallow pillows",
        "regions": [
          {
            "type": "rect",
            "x": 1041,
            "y": 1183,
            "width": 112,
            "height": 125,
            "rx": 21
          },
          {
            "type": "rect",
            "x": 958,
            "y": 1185,
            "width": 95,
            "height": 118,
            "rx": 31
          }
        ],
        "focus": {
          "x": 1098,
          "y": 1246
        }
      },
      {
        "id": "lickable-wallpaper",
        "label": "Lickable wallpaper",
        "regions": [
          {
            "type": "rect",
            "x": 301,
            "y": 1318,
            "width": 151,
            "height": 108,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 244,
            "cy": 1373,
            "rx": 63,
            "ry": 62
          }
        ],
        "focus": {
          "x": 377,
          "y": 1370
        }
      },
      {
        "id": "hot-ice-creams",
        "label": "Hot ice creams for cold days",
        "regions": [
          {
            "type": "rect",
            "x": 634,
            "y": 1317,
            "width": 146,
            "height": 100,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 581,
            "cy": 1360,
            "rx": 61,
            "ry": 74
          }
        ],
        "focus": {
          "x": 707,
          "y": 1365
        }
      },
      {
        "id": "chocolate-milk-cows",
        "label": "Cows that give chocolate milk",
        "regions": [
          {
            "type": "rect",
            "x": 904,
            "y": 1321,
            "width": 165,
            "height": 98,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 859,
            "cy": 1363,
            "rx": 60,
            "ry": 64
          }
        ],
        "focus": {
          "x": 987,
          "y": 1370
        }
      },
      {
        "id": "fizzy-lifting-drinks",
        "label": "Fizzy lifting drinks",
        "regions": [
          {
            "type": "ellipse",
            "cx": 880,
            "cy": 401,
            "rx": 66,
            "ry": 72
          },
          {
            "type": "rect",
            "x": 1017,
            "y": 353,
            "width": 98,
            "height": 109,
            "rx": 23
          },
          {
            "type": "ellipse",
            "cx": 1097,
            "cy": 353,
            "rx": 34,
            "ry": 62
          }
        ],
        "focus": {
          "x": 880,
          "y": 401
        }
      },
      {
        "id": "square-sweets",
        "label": "Square sweets that look round",
        "regions": [
          {
            "type": "rect",
            "x": 933,
            "y": 476,
            "width": 182,
            "height": 101,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 842,
            "cy": 540,
            "rx": 52,
            "ry": 52
          }
        ],
        "focus": {
          "x": 1024,
          "y": 527
        }
      },
      {
        "id": "butterscotch-buttergin",
        "label": "Butterscotch and buttergin",
        "regions": [
          {
            "type": "rect",
            "x": 1000,
            "y": 602,
            "width": 151,
            "height": 96,
            "rx": 18
          },
          {
            "type": "ellipse",
            "cx": 948,
            "cy": 647,
            "rx": 54,
            "ry": 54
          }
        ],
        "focus": {
          "x": 1075,
          "y": 650
        }
      },
      {
        "id": "strawberry-fudge-room",
        "label": "The Strawberry-Flavoured Chocolate-Coated Fudge Room",
        "regions": [
          {
            "type": "rect",
            "x": 297,
            "y": 1436,
            "width": 194,
            "height": 141,
            "rx": 24
          },
          {
            "type": "ellipse",
            "cx": 246,
            "cy": 1506,
            "rx": 60,
            "ry": 69
          }
        ],
        "focus": {
          "x": 395,
          "y": 1507
        }
      },
      {
        "id": "juicing-room",
        "label": "The Juicing Room",
        "regions": [
          {
            "type": "rect",
            "x": 647,
            "y": 1440,
            "width": 134,
            "height": 122,
            "rx": 20
          },
          {
            "type": "ellipse",
            "cx": 594,
            "cy": 1505,
            "rx": 61,
            "ry": 66
          }
        ],
        "focus": {
          "x": 714,
          "y": 1501
        }
      },
      {
        "id": "rubbish-chute-furnace",
        "label": "The rubbish chute & furnace",
        "regions": [
          {
            "type": "rect",
            "x": 921,
            "y": 1440,
            "width": 154,
            "height": 133,
            "rx": 19
          },
          {
            "type": "rect",
            "x": 811,
            "y": 1445,
            "width": 119,
            "height": 125,
            "rx": 15
          }
        ],
        "focus": {
          "x": 999,
          "y": 1507
        }
      },
      {
        "id": "taffy-pulling-room",
        "label": "The taffy-pulling / stretching room",
        "regions": [
          {
            "type": "rect",
            "x": 282,
            "y": 1600,
            "width": 162,
            "height": 118,
            "rx": 24
          },
          {
            "type": "ellipse",
            "cx": 259,
            "cy": 1662,
            "rx": 33,
            "ry": 65
          },
          {
            "type": "ellipse",
            "cx": 214,
            "cy": 1635,
            "rx": 35,
            "ry": 25
          }
        ],
        "focus": {
          "x": 363,
          "y": 1659
        }
      },
      {
        "id": "minusland",
        "label": "Minusland",
        "regions": [
          {
            "type": "rect",
            "x": 596,
            "y": 1606,
            "width": 149,
            "height": 107,
            "rx": 22
          },
          {
            "type": "ellipse",
            "cx": 540,
            "cy": 1662,
            "rx": 67,
            "ry": 65
          }
        ],
        "focus": {
          "x": 671,
          "y": 1660
        }
      },
      {
        "id": "glass-roof",
        "label": "The shaft, skyhooks & glass roof",
        "regions": [
          {
            "type": "rect",
            "x": 897,
            "y": 1597,
            "width": 147,
            "height": 124,
            "rx": 23
          },
          {
            "type": "ellipse",
            "cx": 839,
            "cy": 1656,
            "rx": 65,
            "ry": 74
          }
        ],
        "focus": {
          "x": 971,
          "y": 1659
        }
      },
      {
        "id": "vanilla-fudge-mountain",
        "label": "The Vanilla Fudge Mountain",
        "regions": [
          {
            "type": "rect",
            "x": 313,
            "y": 1749,
            "width": 157,
            "height": 134,
            "rx": 24
          },
          {
            "type": "ellipse",
            "cx": 250,
            "cy": 1823,
            "rx": 80,
            "ry": 85
          }
        ],
        "focus": {
          "x": 392,
          "y": 1816
        }
      },
      {
        "id": "pounding-and-cutting-room",
        "label": "The Pounding and Cutting Room",
        "regions": [
          {
            "type": "rect",
            "x": 610,
            "y": 1749,
            "width": 166,
            "height": 137,
            "rx": 24
          },
          {
            "type": "ellipse",
            "cx": 548,
            "cy": 1819,
            "rx": 73,
            "ry": 75
          },
          {
            "type": "rect",
            "x": 528,
            "y": 1853,
            "width": 44,
            "height": 60,
            "rx": 15
          }
        ],
        "focus": {
          "x": 693,
          "y": 1818
        }
      },
      {
        "id": "spotty-powder-room",
        "label": "The Spotty Powder room",
        "regions": [
          {
            "type": "rect",
            "x": 950,
            "y": 1768,
            "width": 145,
            "height": 124,
            "rx": 24
          },
          {
            "type": "ellipse",
            "cx": 886,
            "cy": 1828,
            "rx": 77,
            "ry": 82
          }
        ],
        "focus": {
          "x": 1023,
          "y": 1830
        }
      }
    ]
  };
  if (typeof module !== "undefined" && module.exports) module.exports = content;
  if (root) root.LiftPanelContent = content;
})(typeof globalThis !== "undefined" ? globalThis : this);
